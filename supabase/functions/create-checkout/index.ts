import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'
import { withIdempotency } from '../_shared/idempotency.ts'
import { createCardSubscriptionCheckoutLink, findOrCreatePagarmeCustomer, PRO_MONTHLY_PRICE_CENTS } from '../_shared/pagarme.ts'
import { requireEnv } from '../_shared/env.ts'

/**
 * POST /billing/create-checkout — card subscription. The price and plan
 * come from server config (PAGARME_PLAN_ID / PRO_MONTHLY_PRICE_CENTS),
 * never from the request body (project rule: client cannot pay R$0,01 by
 * sending amount=1).
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user, authHeader } = await requireAuthedUser(req)
    await enforceRateLimit(`create-checkout:${user.id}`, 5, 60)

    const idempotencyKey = req.headers.get('Idempotency-Key')
    const admin = getAdminClient()

    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id, status, provider_subscription_id')
      .eq('user_id', user.id)
      .eq('payment_type', 'credit_card_subscription')
      .in('status', ['active', 'pending'])
      .maybeSingle()

    if (existingSub && existingSub.status === 'active') {
      // Never create a second monthly charge for someone who already pays.
      return jsonResponse({ alreadySubscribed: true })
    }

    const result = await withIdempotency(idempotencyKey, user.id, 'create-checkout', async () => {
      const { data: profile } = await admin.from('profiles').select('display_name, email').eq('id', user.id).single()

      const { data: existingEntitlement } = await admin
        .from('entitlements')
        .select('customer_id')
        .eq('user_id', user.id)
        .single()

      let customerId = existingEntitlement?.customer_id ?? undefined

      if (!customerId) {
        const customer = await findOrCreatePagarmeCustomer(
          profile?.display_name ?? 'Video Mixer User',
          profile?.email ?? user.email ?? ''
        )
        customerId = customer.id
        await admin.from('entitlements').update({ customer_id: customerId, payment_provider: 'pagarme' }).eq('user_id', user.id)
      }

      const planId = requireEnv('PAGARME_PLAN_ID')
      const link = await createCardSubscriptionCheckoutLink({
        planId,
        userId: user.id,
        customer_id: customerId
      })

      await admin.from('subscriptions').insert({
        user_id: user.id,
        provider: 'pagarme',
        provider_customer_id: customerId,
        payment_type: 'credit_card_subscription',
        status: 'pending',
        amount_cents: PRO_MONTHLY_PRICE_CENTS,
        currency: 'BRL'
      })

      await admin.from('billing_events').insert({
        user_id: user.id,
        provider: 'pagarme',
        provider_event: 'checkout.created',
        provider_object_id: link.id,
        metadata: { payment_type: 'credit_card_subscription' }
      })

      return { checkoutUrl: link.url }
    })

    return jsonResponse(result)
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('create-checkout error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível iniciar o checkout agora.')
  }
})
