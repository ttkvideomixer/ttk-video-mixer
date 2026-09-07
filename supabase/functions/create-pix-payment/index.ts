import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'
import { withIdempotency } from '../_shared/idempotency.ts'
import { createPixOrderCheckoutLink, findOrCreatePagarmeCustomer, PIX_30_DAYS_PRICE_CENTS } from '../_shared/pagarme.ts'

const PENDING_REUSE_WINDOW_MINUTES = 15

/**
 * POST /billing/create-pix-payment — one-time "30 dias de Pro" purchase.
 * Not a subscription: see project rule against calling this "assinatura
 * automática via Pix".
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user, authHeader: _authHeader } = await requireAuthedUser(req)
    await enforceRateLimit(`create-pix-payment:${user.id}`, 5, 60)

    const idempotencyKey = req.headers.get('Idempotency-Key')
    const admin = getAdminClient()

    // Reuse a still-fresh pending Pix charge instead of stacking up dozens
    // from repeated clicks.
    const { data: recentPending } = await admin
      .from('subscriptions')
      .select('id, provider_subscription_id, created_at')
      .eq('user_id', user.id)
      .eq('payment_type', 'pix_30_days')
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - PENDING_REUSE_WINDOW_MINUTES * 60_000).toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (recentPending?.provider_subscription_id) {
      return jsonResponse({ checkoutUrl: recentPending.provider_subscription_id, reused: true })
    }

    const result = await withIdempotency(idempotencyKey, user.id, 'create-pix-payment', async () => {
      const { data: profile } = await admin.from('profiles').select('display_name, email').eq('id', user.id).single()
      const { data: entitlement } = await admin.from('entitlements').select('customer_id').eq('user_id', user.id).single()

      let customerId = entitlement?.customer_id ?? undefined
      if (!customerId) {
        const customer = await findOrCreatePagarmeCustomer(
          profile?.display_name ?? 'Video Mixer User',
          profile?.email ?? user.email ?? ''
        )
        customerId = customer.id
        await admin.from('entitlements').update({ customer_id: customerId, payment_provider: 'pagarme' }).eq('user_id', user.id)
      }

      const link = await createPixOrderCheckoutLink({
        userId: user.id,
        amountCents: PIX_30_DAYS_PRICE_CENTS,
        itemName: 'Video Mixer Pro — 30 dias (Pix)',
        customer_id: customerId
      })

      // provider_subscription_id doubles as "the checkout URL/order
      // reference" for pix_30_days rows — there is no recurring
      // subscription object on this payment type, just an order.
      await admin.from('subscriptions').insert({
        user_id: user.id,
        provider: 'pagarme',
        provider_customer_id: customerId,
        provider_subscription_id: link.url,
        payment_type: 'pix_30_days',
        status: 'pending',
        amount_cents: PIX_30_DAYS_PRICE_CENTS,
        currency: 'BRL'
      })

      await admin.from('billing_events').insert({
        user_id: user.id,
        provider: 'pagarme',
        provider_event: 'checkout.created',
        provider_object_id: link.id,
        metadata: { payment_type: 'pix_30_days' }
      })

      return { checkoutUrl: link.url }
    })

    return jsonResponse(result)
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('create-pix-payment error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível gerar o Pix agora.')
  }
})
