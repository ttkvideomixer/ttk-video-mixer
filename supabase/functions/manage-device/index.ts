import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getUserClient, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'

type ManageDeviceBody =
  | { action: 'register'; deviceHash: string; installationId: string; deviceName: string }
  | { action: 'list' }
  | { action: 'revoke'; deviceId: string }

/**
 * POST /devices/manage — register on launch, list for "Minha Conta >
 * Dispositivos", revoke to free up a Pro seat (max 2 active devices).
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user, authHeader } = await requireAuthedUser(req)
    const body = (await req.json()) as ManageDeviceBody
    const userClient = getUserClient(authHeader)

    if (body.action === 'register') {
      await enforceRateLimit(`device-register:${user.id}`, 20, 60)

      const { data, error } = await userClient
        .rpc('register_device', {
          p_device_hash: body.deviceHash,
          p_installation_id: body.installationId,
          p_device_name: body.deviceName
        })
        .single()

      if (error) throw new HttpError(500, ErrorCodes.SERVER_ERROR, error.message)

      const r = data as { device_id: string | null; trial_eligible: boolean; device_limit_reached: boolean }
      if (r.device_limit_reached) {
        return jsonResponse({ ok: false, code: ErrorCodes.DEVICE_LIMIT }, 200)
      }
      return jsonResponse({ ok: true, deviceId: r.device_id, trialEligible: r.trial_eligible })
    }

    if (body.action === 'list') {
      const { data, error } = await userClient.from('my_devices').select('*')
      if (error) throw new HttpError(500, ErrorCodes.SERVER_ERROR, error.message)
      return jsonResponse({ devices: data })
    }

    if (body.action === 'revoke') {
      const admin = getAdminClient()
      const { data: device } = await admin.from('devices').select('user_id').eq('id', body.deviceId).single()
      if (!device || device.user_id !== user.id) {
        throw new HttpError(404, ErrorCodes.INVALID_REQUEST, 'Dispositivo não encontrado.')
      }
      await admin.from('devices').update({ revoked_at: new Date().toISOString() }).eq('id', body.deviceId)
      return jsonResponse({ ok: true })
    }

    throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'Ação inválida.')
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('manage-device error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível gerenciar dispositivos agora.')
  }
})
