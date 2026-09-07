import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'

/**
 * POST /account/delete — LGPD "excluir minha conta". Deletes the
 * auth.users row, which cascades to profiles/entitlements/devices/
 * subscriptions via the FKs declared `on delete cascade`. billing_events
 * and payment_webhook_events are financial/audit records and are kept
 * with their user_id (not cascaded) — consult applicable retention rules
 * before changing that; do not delete financial records purely on user
 * request without checking legal requirements for your jurisdiction.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user } = await requireAuthedUser(req)
    const admin = getAdminClient()

    const { data: activeSub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('payment_type', 'credit_card_subscription')
      .eq('status', 'active')
      .maybeSingle()

    if (activeSub) {
      throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'Cancele sua assinatura antes de excluir a conta.')
    }

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw new HttpError(500, ErrorCodes.SERVER_ERROR, error.message)

    return jsonResponse({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('delete-account error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível excluir sua conta agora.')
  }
})
