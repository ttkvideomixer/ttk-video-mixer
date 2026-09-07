import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getUserClient, HttpError } from '../_shared/supabaseClients.ts'

interface CompleteRequestBody {
  reservationId: string
  successfulOutputs: number
  failedOutputs: number
}

/**
 * POST /generation/complete — settles a reservation once the queue
 * finishes (or is canceled). Trial credits for jobs that errored out are
 * refunded here (see complete_generation_reservation), so a flaky render
 * never permanently costs the user part of their 27 free videos.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { authHeader } = await requireAuthedUser(req)
    const body = (await req.json()) as CompleteRequestBody

    if (!body.reservationId) {
      throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'reservationId é obrigatório.')
    }

    const client = getUserClient(authHeader)
    const { error } = await client.rpc('complete_generation_reservation', {
      p_reservation_id: body.reservationId,
      p_successful_outputs: body.successfulOutputs ?? 0,
      p_failed_outputs: body.failedOutputs ?? 0
    })

    if (error) throw new HttpError(500, ErrorCodes.SERVER_ERROR, error.message)

    return jsonResponse({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('complete-generation error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível registrar a conclusão da geração.')
  }
})
