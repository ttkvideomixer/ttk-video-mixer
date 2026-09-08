import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'

const HANDOFF_TTL_SECONDS = 120

/**
 * POST /create-desktop-handoff — mints a short-lived, single-use token the
 * website hands to an already-installed desktop app via the
 * `videomixer://auth/handoff` deep link, so the user doesn't have to log in
 * a second time there. The token itself grants nothing on its own: redeeming
 * it (see redeem-desktop-handoff) only ever produces a magic-link token_hash
 * for the SAME account that authenticated this request.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user } = await requireAuthedUser(req)
    await enforceRateLimit(`create-desktop-handoff:${user.id}`, 10, 60)

    const admin = getAdminClient()
    const expiresAt = new Date(Date.now() + HANDOFF_TTL_SECONDS * 1000).toISOString()

    const { data, error } = await admin
      .from('desktop_login_handoffs')
      .insert({ user_id: user.id, expires_at: expiresAt })
      .select('token')
      .single()

    if (error) throw new HttpError(500, ErrorCodes.SERVER_ERROR, error.message)

    return jsonResponse({ token: data.token, expiresInSeconds: HANDOFF_TTL_SECONDS })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('create-desktop-handoff error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível gerar o login automático para o app agora.')
  }
})
