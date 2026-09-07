import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { cancelPagarmeSubscription } from '../_shared/pagarme.ts'

/**
 * POST /billing/cancel-subscription — stops future renewals. Access
 * continues until current_period_end (see project rule "período já
 * pago"); this never touches current_period_end itself.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user } = await requireAuthedUser(req)
    const admin = getAdminClient()

    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, provider_subscription_id')
      .eq('user_id', user.id)
      .eq('payment_type', 'credit_card_subscription')
      .eq('status', 'active')
      .maybeSingle()

    if (!sub?.provider_subscription_id) {
      throw new HttpError(404, ErrorCodes.INVALID_REQUEST, 'Nenhuma assinatura ativa encontrada.')
    }

    await cancelPagarmeSubscription(sub.provider_subscription_id)

    await admin.from('subscriptions').update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq('id', sub.id)
    await admin.from('entitlements').update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq('user_id', user.id)

    await admin.from('billing_events').insert({
      user_id: user.id,
      provider: 'pagarme',
      provider_event: 'subscription.cancel_requested',
      provider_object_id: sub.provider_subscription_id
    })

    return jsonResponse({ ok: true, cancelAtPeriodEnd: true })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('cancel-subscription error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível cancelar sua assinatura agora.')
  }
})
