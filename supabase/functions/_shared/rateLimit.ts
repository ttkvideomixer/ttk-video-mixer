import { getAdminClient } from './supabaseClients.ts'
import { HttpError } from './supabaseClients.ts'
import { ErrorCodes } from './errors.ts'

/**
 * Fixed-window rate limit backed by the `rate_limits` table. Call this
 * before doing real work on any endpoint that touches auth or payment
 * (login, checkout creation, generation authorize, password reset).
 * Throws HttpError(429) when the caller should back off.
 */
export async function enforceRateLimit(bucketKey: string, maxHits: number, windowSeconds: number): Promise<void> {
  const admin = getAdminClient()
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_bucket_key: bucketKey,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds
  })

  if (error) {
    // Fail open on infra errors — a broken rate limiter must never take the
    // whole product down. Logged in Supabase's function logs by default.
    console.error('rate limit check failed', error)
    return
  }

  if (data === false) {
    throw new HttpError(429, ErrorCodes.RATE_LIMITED, 'Muitas tentativas. Aguarde um momento antes de tentar novamente.')
  }
}
