import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'

/**
 * POST /redeem-desktop-handoff — called by the DESKTOP APP, which has no
 * session yet, with the token from a `videomixer://auth/handoff?token=...`
 * deep link. Never authenticated by a JWT: the token itself, being random,
 * single-use and short-lived (see create-desktop-handoff), IS the
 * credential — same trust model as a Supabase magic link. Returns a
 * magic-link token_hash the app immediately exchanges via
 * supabase.auth.verifyOtp; this function never returns a live access or
 * refresh token itself.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    await enforceRateLimit('redeem-desktop-handoff', 60, 60)

    const { token } = (await req.json().catch(() => ({}))) as { token?: string }
    if (!token) throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'Token ausente.')

    const admin = getAdminClient()

    // Atomically claim the row: the update only matches (and only one
    // caller can ever succeed) while it's unused and unexpired.
    const { data: claimed, error: claimError } = await admin
      .from('desktop_login_handoffs')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('user_id')
      .maybeSingle()

    if (claimError) throw new HttpError(500, ErrorCodes.SERVER_ERROR, claimError.message)
    if (!claimed) {
      throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'Link expirado ou já utilizado. Faça login normalmente.')
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(claimed.user_id)
    if (userError || !userData.user?.email) {
      throw new HttpError(500, ErrorCodes.SERVER_ERROR, 'Não foi possível localizar a conta.')
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      throw new HttpError(500, ErrorCodes.SERVER_ERROR, linkError?.message ?? 'Não foi possível gerar o login automático.')
    }

    return jsonResponse({ tokenHash: linkData.properties.hashed_token })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('redeem-desktop-handoff error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível concluir o login automático.')
  }
})
