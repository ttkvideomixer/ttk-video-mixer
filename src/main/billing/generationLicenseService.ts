import { getSupabaseClient } from '../auth/supabaseClient'
import { app } from 'electron'
import type { GenerationAuthorization } from '@shared/billing'
import { normalizeFunctionsError } from './httpFunctionError'

export interface AuthorizeGenerationInput {
  requestedOutputs: number
  combinationHash: string
  deviceId: string | null
}

/**
 * The one required call before any real (non-preview) batch is allowed to
 * start. Wired into ipc/handlers.ts's `startGeneration` handler — the
 * renderer can ask for this, but only the MAIN PROCESS decides whether
 * `GenerationQueue.start()` actually runs (see project rule: never let the
 * renderer call queue.start() without main-process validation).
 */
export async function authorizeGeneration(input: AuthorizeGenerationInput): Promise<GenerationAuthorization> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('authorize-generation', {
    body: {
      requestedOutputs: input.requestedOutputs,
      combinationHash: input.combinationHash,
      appVersion: app.getVersion(),
      deviceId: input.deviceId
    }
  })
  if (error) throw await normalizeFunctionsError(error)
  return data as GenerationAuthorization
}

export async function completeGeneration(reservationId: string, successfulOutputs: number, failedOutputs: number): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.functions.invoke('complete-generation', {
    body: { reservationId, successfulOutputs, failedOutputs }
  })
  if (error) {
    // Non-fatal: worst case a reconciliation job/expiry sorts this out
    // later. Never let this crash a generation the user already paid/used
    // trial credits for.
    // eslint-disable-next-line no-console
    console.error('complete-generation failed', await normalizeFunctionsError(error))
  }
}
