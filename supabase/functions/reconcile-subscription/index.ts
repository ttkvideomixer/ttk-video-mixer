import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'
import { getPagarmeSubscription } from '../_shared/pagarme.ts'

/**
 * POST /billing/reconcile-subscription — defense in depth for missed/late
 * webhooks (project rule: never trust the webhook exclusively). Called from
 * "Minha Conta > Atualizar Status" and opportunistically after a checkout.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user } = await requireAuthedUser(req)
    await enforceRateLimit(`reconcile:${user.id}`, 10, 60)

    const admin = getAdminClient()
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, provider_subscription_id, payment_type, status')
      .eq('user_id', user.id)
      .eq('payment_type', 'credit_card_subscription')
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (!sub?.provider_subscription_id) {
      return jsonResponse({ ok: true, changed: false, reason: 'no_card_subscription' })
    }

    const remote = await getPagarmeSubscription(sub.provider_subscription_id)
    const remoteStatus = String(remote.status ?? '').toLowerCase()
    const currentPeriodEnd = (remote.current_period_end as string | undefined) ?? null

    const isActive = remoteStatus === 'active' || remoteStatus === 'trialing'
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (isActive && currentPeriodEnd) {
      updates.status = 'active'
      updates.plan = 'pro'
      updates.current_period_end = currentPeriodEnd
      updates.last_payment_status = 'paid'
    } else if (remoteStatus === 'past_due' || remoteStatus === 'unpaid') {
      updates.status = 'past_due'
      updates.last_payment_status = 'failed'
    } else if (remoteStatus === 'canceled' || remoteStatus === 'ended') {
      updates.cancel_at_period_end = true
    }

    await admin.from('entitlements').update(updates).eq('user_id', user.id)
    await admin
      .from('subscriptions')
      .update({ status: remoteStatus || sub.status, period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
      .eq('id', sub.id)

    return jsonResponse({ ok: true, changed: true, remoteStatus })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('reconcile-subscription error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível atualizar o status da assinatura agora.')
  }
})
