/**
 * Pure mirror of the Postgres function `public._compute_entitlement()`
 * (supabase/migrations/20260910000000_admin_panel.sql) — the single
 * authority every client (desktop, website, admin panel) ultimately reads
 * from. That SQL function is the actual production authority and cannot be
 * unit-tested directly in this environment (no live Postgres instance
 * available here); this file is the tested specification it must match, and
 * it's also reused directly by the admin UI to render an entitlement badge
 * from data already fetched (profile + entitlement + grants), without an
 * extra round trip. It is NEVER used to authorize a real generation — that
 * always goes through the live RPC.
 *
 * Priority order (highest wins): BLOCKED > ACTIVE ADMIN GRANT > ACTIVE
 * SUBSCRIPTION > TRIAL + BONUS CREDITS > nothing.
 */

export interface EntitlementInput {
  blockedAt: string | null
  plan: 'free' | 'pro'
  currentPeriodEnd: string | null
  trialTotal: number
  trialUsed: number
  bonusCredits: number
  activeGrant: { grantType: string; endAt: string } | null
  now?: Date
}

export interface EntitlementResult {
  blocked: boolean
  generationAllowed: boolean
  generationLimit: number | null
  effectiveTrialTotal: number
  trialRemaining: number
  mode: 'blocked' | 'admin_grant' | 'subscription' | 'trial' | 'none'
}

export function computeEntitlement(input: EntitlementInput): EntitlementResult {
  const now = input.now ?? new Date()
  const blocked = input.blockedAt !== null
  const periodValid = input.currentPeriodEnd !== null && new Date(input.currentPeriodEnd) > now
  const effectiveTrialTotal = input.trialTotal + input.bonusCredits
  const trialRemaining = Math.max(0, effectiveTrialTotal - input.trialUsed)

  if (blocked) {
    return { blocked: true, generationAllowed: false, generationLimit: 0, effectiveTrialTotal, trialRemaining, mode: 'blocked' }
  }

  if (input.activeGrant) {
    return { blocked: false, generationAllowed: true, generationLimit: null, effectiveTrialTotal, trialRemaining, mode: 'admin_grant' }
  }

  if (input.plan === 'pro' && periodValid) {
    return { blocked: false, generationAllowed: true, generationLimit: null, effectiveTrialTotal, trialRemaining, mode: 'subscription' }
  }

  if (trialRemaining > 0) {
    return { blocked: false, generationAllowed: true, generationLimit: trialRemaining, effectiveTrialTotal, trialRemaining, mode: 'trial' }
  }

  return { blocked: false, generationAllowed: false, generationLimit: 0, effectiveTrialTotal, trialRemaining, mode: 'none' }
}
