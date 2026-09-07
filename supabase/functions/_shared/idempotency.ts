import { getAdminClient } from './supabaseClients.ts'

/**
 * Runs `fn` exactly once per idempotency key. A retried request (network
 * blip) or an accidental double-click that races past the disabled-button
 * guard on the desktop side gets back the SAME stored response instead of
 * creating a second checkout/charge.
 */
export async function withIdempotency<T>(key: string | null, userId: string, endpoint: string, fn: () => Promise<T>): Promise<T> {
  if (!key) return fn()

  const admin = getAdminClient()
  const { data: existing } = await admin.from('idempotency_keys').select('response').eq('key', key).maybeSingle()

  if (existing?.response) {
    return existing.response as T
  }

  const result = await fn()

  await admin.from('idempotency_keys').insert({ key, user_id: userId, endpoint, response: result }).select().maybeSingle()

  return result
}
