// Shared between billing-webhook (real deliveries) and admin-reprocess-webhook
// (manual retry from the admin panel, section 88) so there is exactly one
// implementation of "what a given event type does" — never two copies that
// could drift apart.

export interface PagarmeWebhookPayload {
  id: string
  type: string
  created_at?: string
  data: Record<string, unknown> & {
    id?: string
    metadata?: Record<string, string>
    customer?: { id?: string }
    subscription?: { id?: string }
    current_period_start?: string
    current_period_end?: string
    status?: string
    // Pagar.me charge/order objects report amounts in cents. Verify this
    // field name against a real webhook payload for your account before
    // relying on it for financial reporting — same caveat as the rest of
    // this integration (see README "NÃO INVENTAR ENDPOINTS").
    amount?: number
  }
}

const PIX_PERIOD_DAYS = 30

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * Runs one webhook event end to end: logs it to billing_events, updates
 * payment_webhook_events with the outcome, and applies the entitlement
 * change. Never throws — a processing failure is recorded (last_error) but
 * always acknowledged, so Pagar.me doesn't retry an event we've already
 * durably stored (see caller comments for why).
 */
// deno-lint-ignore no-explicit-any
export async function runWebhookEvent(admin: any, payload: PagarmeWebhookPayload): Promise<void> {
  try {
    await processEvent(admin, payload)
    await admin
      .from('payment_webhook_events')
      .update({ processed_at: new Date().toISOString(), last_error: null })
      .eq('provider_event_id', payload.id)
  } catch (err) {
    console.error('billing-webhook processing error', payload.type, err)
    await admin
      .from('payment_webhook_events')
      .update({ last_error: err instanceof Error ? err.message : String(err) })
      .eq('provider_event_id', payload.id)
  }
}

// deno-lint-ignore no-explicit-any
async function processEvent(admin: any, payload: PagarmeWebhookPayload): Promise<void> {
  const { type, data } = payload
  const userId = await resolveUserId(admin, data)
  if (!userId) {
    console.warn('billing-webhook: could not resolve user_id for event', type, payload.id)
    return
  }

  await admin.from('billing_events').insert({
    user_id: userId,
    provider: 'pagarme',
    provider_event: type,
    provider_object_id: data.id ?? null,
    status: (data.status as string) ?? null,
    amount_cents: typeof data.amount === 'number' ? data.amount : null,
    metadata: { event_id: payload.id }
  })

  switch (type) {
    case 'order.paid': {
      const purchaseType = data.metadata?.purchase_type
      if (purchaseType === 'pix_30_days') {
        await activatePixPeriod(admin, userId, data.id ?? null)
      }
      break
    }

    case 'order.payment_failed':
    case 'order.canceled': {
      await admin
        .from('subscriptions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('payment_type', 'pix_30_days')
        .eq('status', 'pending')
      break
    }

    case 'charge.paid':
    case 'invoice.paid': {
      await activateCardPeriod(admin, userId, data)
      break
    }

    case 'charge.payment_failed':
    case 'invoice.payment_failed': {
      await admin
        .from('entitlements')
        .update({ status: 'past_due', last_payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      break
    }

    case 'subscription.created': {
      const subscriptionId = (data.id as string) ?? null
      await admin
        .from('subscriptions')
        .update({ provider_subscription_id: subscriptionId, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('payment_type', 'credit_card_subscription')
        .eq('status', 'pending')
      break
    }

    case 'subscription.canceled': {
      await admin
        .from('entitlements')
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      await admin
        .from('subscriptions')
        .update({ status: 'canceled', cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('payment_type', 'credit_card_subscription')
      break
    }

    case 'charge.refunded': {
      // Full refund of the charge that granted the current period: cut
      // access now rather than leaving a paid-looking period active after
      // the money was returned.
      const now = new Date().toISOString()
      await admin
        .from('entitlements')
        .update({ status: 'canceled', current_period_end: now, last_payment_status: 'refunded', updated_at: now })
        .eq('user_id', userId)
      break
    }

    case 'chargeback.received': {
      const now = new Date().toISOString()
      await admin
        .from('entitlements')
        .update({ status: 'suspended', current_period_end: now, updated_at: now })
        .eq('user_id', userId)
      break
    }

    default:
      // Other events (customer.*, card.*, plan.*, checkout.*, ...) are
      // logged above via billing_events but don't change entitlement state.
      break
  }
}

// deno-lint-ignore no-explicit-any
async function resolveUserId(admin: any, data: PagarmeWebhookPayload['data']): Promise<string | null> {
  if (data.metadata?.user_id) return data.metadata.user_id

  const customerId = data.customer?.id
  if (customerId) {
    const { data: row } = await admin.from('entitlements').select('user_id').eq('customer_id', customerId).maybeSingle()
    if (row?.user_id) return row.user_id as string
  }

  const subscriptionId = data.subscription?.id ?? (data.id as string | undefined)
  if (subscriptionId) {
    const { data: row } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('provider_subscription_id', subscriptionId)
      .maybeSingle()
    if (row?.user_id) return row.user_id as string
  }

  return null
}

// deno-lint-ignore no-explicit-any
async function activatePixPeriod(admin: any, userId: string, orderId: string | null): Promise<void> {
  const { data: entitlement } = await admin.from('entitlements').select('current_period_end').eq('user_id', userId).single()

  const base = entitlement?.current_period_end && new Date(entitlement.current_period_end) > new Date() ? new Date(entitlement.current_period_end) : new Date()
  const newPeriodEnd = addDays(base, PIX_PERIOD_DAYS)

  await admin
    .from('entitlements')
    .update({
      plan: 'pro',
      status: 'active',
      payment_provider: 'pagarme',
      current_period_start: new Date().toISOString(),
      current_period_end: newPeriodEnd.toISOString(),
      cancel_at_period_end: false,
      last_payment_status: 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  await admin
    .from('subscriptions')
    .update({
      status: 'active',
      period_start: new Date().toISOString(),
      period_end: newPeriodEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('payment_type', 'pix_30_days')
    .eq('status', 'pending')

  void orderId
}

// deno-lint-ignore no-explicit-any
async function activateCardPeriod(admin: any, userId: string, data: PagarmeWebhookPayload['data']): Promise<void> {
  const periodEnd = data.current_period_end ? new Date(data.current_period_end) : addDays(new Date(), 31)
  const periodStart = data.current_period_start ? new Date(data.current_period_start) : new Date()

  await admin
    .from('entitlements')
    .update({
      plan: 'pro',
      status: 'active',
      payment_provider: 'pagarme',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      last_payment_status: 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  await admin
    .from('subscriptions')
    .update({
      status: 'active',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('payment_type', 'credit_card_subscription')
}
