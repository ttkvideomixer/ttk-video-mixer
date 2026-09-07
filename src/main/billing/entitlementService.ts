import { getSupabaseClient } from '../auth/supabaseClient'
import type { EntitlementResponse } from '@shared/billing'
import { normalizeFunctionsError } from './httpFunctionError'

/**
 * GET /entitlement — always a live server call. Never resolved from a
 * locally cached value when the question is "can I generate right now?"
 * (see generationLicenseService, which is the one that actually gates
 * ffmpeg). This function backs the UI badge / trial counter / Minha Conta
 * screen and periodic polling.
 */
export async function fetchEntitlement(): Promise<EntitlementResponse> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('get-entitlement', { method: 'GET' })
  if (error) throw await normalizeFunctionsError(error)
  return data as EntitlementResponse
}
