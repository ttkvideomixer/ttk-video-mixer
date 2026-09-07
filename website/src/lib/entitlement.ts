import type { SupabaseClient } from '@supabase/supabase-js'

export interface EntitlementSummary {
  plan: string
  status: string
  trialTotal: number
  trialUsed: number
  trialRemaining: number
  generationAllowed: boolean
}

/**
 * Calls the exact same `resolve_entitlement()` RPC the desktop app and its
 * `get-entitlement` Edge Function use — same RLS, same server-computed
 * numbers. The website never invents or caches its own trial count; if this
 * fails, callers should show a neutral message instead of a guessed number
 * (project rule: never overstate what the account is entitled to).
 */
export async function getEntitlementSummary(supabase: SupabaseClient): Promise<EntitlementSummary | null> {
  const { data, error } = await supabase.rpc('resolve_entitlement').single()
  if (error || !data) return null

  const row = data as {
    plan: string
    status: string
    trial_total: number
    trial_used: number
    trial_remaining: number
    generation_allowed: boolean
  }

  return {
    plan: row.plan,
    status: row.status,
    trialTotal: row.trial_total,
    trialUsed: row.trial_used,
    trialRemaining: row.trial_remaining,
    generationAllowed: row.generation_allowed
  }
}
