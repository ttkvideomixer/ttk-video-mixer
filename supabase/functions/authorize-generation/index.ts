import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getUserClient, HttpError } from '../_shared/supabaseClients.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'
import { isBillingMockActive } from '../_shared/env.ts'

interface AuthorizeRequestBody {
  requestedOutputs: number
  combinationHash: string
  appVersion: string
  deviceId: string | null
}

/**
 * POST /generation/authorize — the ONE gate that must say yes before the
 * Electron main process is allowed to spawn a single ffmpeg process for a
 * real (non-preview) batch. There is no signature scheme layered on top of
 * the response on purpose: the main process calls this endpoint itself
 * over HTTPS and acts on the response within the same request/response —
 * TLS already authenticates the server, and `reservationId` is only ever
 * valid because it exists as a row this same backend owns (checked again,
 * for real, in `complete-generation`). Adding an app-level signature here
 * would just be decoration, not additional protection — the actual
 * boundary is "the main process asks the server every time," not a token
 * format.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user, authHeader } = await requireAuthedUser(req)
    await enforceRateLimit(`authorize-generation:${user.id}`, 20, 60)

    const body = (await req.json()) as AuthorizeRequestBody
    if (!body.requestedOutputs || body.requestedOutputs <= 0) {
      throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'requestedOutputs deve ser maior que zero.')
    }

    if (isBillingMockActive()) {
      return jsonResponse({ allowed: true, mode: 'unlimited', allowedOutputs: body.requestedOutputs })
    }

    const client = getUserClient(authHeader)

    const { data: entitlement, error: entitlementError } = await client.rpc('resolve_entitlement').single()
    if (entitlementError) throw new HttpError(500, ErrorCodes.SERVER_ERROR, entitlementError.message)

    const e = entitlement as { plan: string; generation_allowed: boolean; trial_remaining: number; blocked: boolean }

    if (e.blocked) {
      return jsonResponse({ allowed: false, reason: ErrorCodes.ACCOUNT_BLOCKED }, 200)
    }

    if (!e.generation_allowed) {
      const reason = e.plan === 'pro' ? ErrorCodes.SUBSCRIPTION_PAST_DUE : ErrorCodes.SUBSCRIPTION_REQUIRED
      return jsonResponse({ allowed: false, reason }, 200)
    }

    const { data: reservation, error: reservationError } = await client
      .rpc('reserve_trial_generation', {
        p_requested_outputs: body.requestedOutputs,
        p_combination_hash: body.combinationHash,
        p_app_version: body.appVersion,
        p_device_id: body.deviceId
      })
      .single()

    if (reservationError) {
      if (reservationError.message.includes('ACCOUNT_BLOCKED')) {
        return jsonResponse({ allowed: false, reason: ErrorCodes.ACCOUNT_BLOCKED }, 200)
      }
      if (reservationError.message.includes('TRIAL_EXHAUSTED')) {
        return jsonResponse({ allowed: false, reason: ErrorCodes.TRIAL_EXHAUSTED }, 200)
      }
      throw new HttpError(500, ErrorCodes.SERVER_ERROR, reservationError.message)
    }

    const r = reservation as { reservation_id: string; allowed_outputs: number; expires_at: string }

    return jsonResponse({
      allowed: true,
      mode: e.plan === 'pro' ? 'unlimited' : 'trial',
      allowedOutputs: r.allowed_outputs,
      reservationId: r.reservation_id,
      expiresAt: r.expires_at
    })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('authorize-generation error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível autorizar a geração agora.')
  }
})
