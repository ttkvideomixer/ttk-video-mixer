import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'

/**
 * POST /billing/reactivate-subscription — undoes a pending cancellation
 * while the already-paid period hasn't ended yet.
 *
 * VERIFY BEFORE GOING LIVE: cancel-subscription calls Pagar.me's
 * `DELETE /subscriptions/:id`, which — per the "criar assinatura" reference
 * — removes the subscription object outright; V5 did not expose a
 * confirmed "un-cancel" endpoint in what this integration could verify. So
 * this function only flips the LOCAL cancel_at_period_end flag back off
 * (which is what actually keeps generation unlocked, since resolve_
 * entitlement() only looks at current_period_end/status, never at Pagar.me
 * directly). It will NOT resume next month's automatic billing on its own,
 * because the underlying provider subscription was already deleted. If
 * Pagar.me adds/exposes a real un-cancel endpoint for your account, wire it
 * in here; until then, tell the user their access is restored but that a
 * fresh checkout will be needed once the current period actually ends.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user } = await requireAuthedUser(req)
    const admin = getAdminClient()

    const { data: entitlement } = await admin
      .from('entitlements')
      .select('cancel_at_period_end, current_period_end, status')
      .eq('user_id', user.id)
      .single()

    if (!entitlement?.cancel_at_period_end) {
      throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'Não há cancelamento pendente para reverter.')
    }

    const periodStillValid = entitlement.current_period_end && new Date(entitlement.current_period_end) > new Date()
    if (!periodStillValid) {
      throw new HttpError(400, ErrorCodes.SUBSCRIPTION_EXPIRED, 'O período já encerrou. Assine novamente para continuar.')
    }

    await admin.from('entitlements').update({ cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('payment_type', 'credit_card_subscription')

    await admin.from('billing_events').insert({
      user_id: user.id,
      provider: 'pagarme',
      provider_event: 'subscription.reactivated'
    })

    return jsonResponse({ ok: true, note: 'Acesso restaurado até o fim do período atual. Uma nova cobrança automática pode exigir uma nova assinatura quando este período terminar.' })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('reactivate-subscription error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível reativar sua assinatura agora.')
  }
})
