import { describe, expect, it } from 'vitest'
import { computeEntitlement, type EntitlementInput } from './entitlementEngine'

const NOW = new Date('2026-06-15T12:00:00Z')

function base(overrides: Partial<EntitlementInput> = {}): EntitlementInput {
  return {
    blockedAt: null,
    plan: 'free',
    currentPeriodEnd: null,
    trialTotal: 27,
    trialUsed: 0,
    bonusCredits: 0,
    activeGrant: null,
    now: NOW,
    ...overrides
  }
}

describe('computeEntitlement — blocked always wins (section 194/199)', () => {
  it('a blocked user cannot generate even with an active subscription', () => {
    const result = computeEntitlement(
      base({ blockedAt: '2026-06-01T00:00:00Z', plan: 'pro', currentPeriodEnd: '2026-07-01T00:00:00Z' })
    )
    expect(result.blocked).toBe(true)
    expect(result.generationAllowed).toBe(false)
    expect(result.mode).toBe('blocked')
  })

  it('a blocked user cannot generate even with an active admin grant', () => {
    const result = computeEntitlement(
      base({ blockedAt: '2026-06-01T00:00:00Z', activeGrant: { grantType: 'promo', endAt: '2026-07-01T00:00:00Z' } })
    )
    expect(result.generationAllowed).toBe(false)
    expect(result.mode).toBe('blocked')
  })
})

describe('computeEntitlement — unblock restores real entitlement (section 195)', () => {
  it('restores subscription access once unblocked', () => {
    const result = computeEntitlement(base({ blockedAt: null, plan: 'pro', currentPeriodEnd: '2026-07-01T00:00:00Z' }))
    expect(result.generationAllowed).toBe(true)
    expect(result.mode).toBe('subscription')
  })

  it('restores trial access once unblocked', () => {
    const result = computeEntitlement(base({ blockedAt: null, trialUsed: 5 }))
    expect(result.generationAllowed).toBe(true)
    expect(result.trialRemaining).toBe(22)
  })
})

describe('computeEntitlement — admin bonus grant (section 196)', () => {
  it('grants Pro-equivalent access while active, even on a free plan', () => {
    const result = computeEntitlement(base({ activeGrant: { grantType: 'support', endAt: '2026-06-20T00:00:00Z' } }))
    expect(result.generationAllowed).toBe(true)
    expect(result.generationLimit).toBeNull()
    expect(result.mode).toBe('admin_grant')
  })

  it('grants no unlimited access once expired — falls back to the real entitlement', () => {
    // An expired grant is never passed in as activeGrant at all (the caller
    // — resolve_entitlement's SQL — only looks up grants where end_at > now).
    const result = computeEntitlement(base({ activeGrant: null, trialUsed: 27 }))
    expect(result.generationAllowed).toBe(false)
    expect(result.mode).toBe('none')
  })

  it('a subscriber keeps Pro access when a grant also exists (does not downgrade)', () => {
    const result = computeEntitlement(
      base({ plan: 'pro', currentPeriodEnd: '2026-07-01T00:00:00Z', activeGrant: { grantType: 'manual', endAt: '2026-06-20T00:00:00Z' } })
    )
    expect(result.generationAllowed).toBe(true)
  })
})

describe('computeEntitlement — active subscription (section 197)', () => {
  it('allows unlimited generation while the period is valid', () => {
    const result = computeEntitlement(base({ plan: 'pro', currentPeriodEnd: '2026-07-01T00:00:00Z' }))
    expect(result.generationAllowed).toBe(true)
    expect(result.generationLimit).toBeNull()
  })

  it('does not grant unlimited access once the period has expired (falls back to trial)', () => {
    const result = computeEntitlement(base({ plan: 'pro', currentPeriodEnd: '2026-06-01T00:00:00Z', trialUsed: 27 }))
    expect(result.generationAllowed).toBe(false)
    expect(result.mode).toBe('none')
  })
})

describe('computeEntitlement — trial and bonus credits (section 198)', () => {
  it('reports remaining trial credits', () => {
    const result = computeEntitlement(base({ trialUsed: 20 }))
    expect(result.trialRemaining).toBe(7)
    expect(result.generationAllowed).toBe(true)
  })

  it('adds admin-granted bonus credits on top of the base trial', () => {
    const result = computeEntitlement(base({ trialUsed: 27, bonusCredits: 10 }))
    expect(result.effectiveTrialTotal).toBe(37)
    expect(result.trialRemaining).toBe(10)
    expect(result.generationAllowed).toBe(true)
  })

  it('denies generation once trial and bonus credits are both exhausted', () => {
    const result = computeEntitlement(base({ trialUsed: 30, bonusCredits: 3 }))
    expect(result.trialRemaining).toBe(0)
    expect(result.generationAllowed).toBe(false)
  })
})

describe('computeEntitlement — combined block override (section 199)', () => {
  it('blocked + active subscription + active grant + trial remaining: still blocked', () => {
    const result = computeEntitlement(
      base({
        blockedAt: '2026-06-10T00:00:00Z',
        plan: 'pro',
        currentPeriodEnd: '2026-07-01T00:00:00Z',
        activeGrant: { grantType: 'promo', endAt: '2026-07-01T00:00:00Z' },
        trialUsed: 0
      })
    )
    expect(result.blocked).toBe(true)
    expect(result.generationAllowed).toBe(false)
  })
})
