import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getUserClient, HttpError } from '../_shared/supabaseClients.ts'
import { isBillingMockActive } from '../_shared/env.ts'

/**
 * GET /entitlement — the single source of truth the desktop app polls on
 * startup, every ~10-15 minutes while open, and (separately) right before
 * `authorize-generation`. All values come from resolve_entitlement(),
 * which is computed server-side using the database's own clock.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user, authHeader } = await requireAuthedUser(req)

    if (isBillingMockActive()) {
      return jsonResponse({
        userId: user.id,
        plan: 'pro',
        status: 'active',
        trialTotal: 27,
        trialUsed: 0,
        trialRemaining: 27,
        trialEligible: true,
        generationAllowed: true,
        generationLimit: null,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        paymentMethod: 'billing_mock',
        lastPaymentStatus: 'mocked',
        serverTime: new Date().toISOString()
      })
    }

    const client = getUserClient(authHeader)

    const { data, error } = await client.rpc('resolve_entitlement').single()
    if (error) throw new HttpError(500, ErrorCodes.SERVER_ERROR, error.message)

    const row = data as {
      plan: string
      status: string
      trial_total: number
      trial_used: number
      trial_remaining: number
      trial_eligible: boolean
      generation_allowed: boolean
      generation_limit: number | null
      current_period_end: string | null
      cancel_at_period_end: boolean
      payment_provider: string | null
      last_payment_status: string | null
      server_time: string
      blocked: boolean
      blocked_reason: string | null
      access_grant_active: boolean
      access_grant_type: string | null
      access_grant_end: string | null
    }

    return jsonResponse({
      userId: user.id,
      plan: row.plan,
      status: row.status,
      trialTotal: row.trial_total,
      trialUsed: row.trial_used,
      trialRemaining: row.trial_remaining,
      trialEligible: row.trial_eligible,
      generationAllowed: row.generation_allowed,
      generationLimit: row.generation_limit,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      paymentMethod: row.payment_provider,
      lastPaymentStatus: row.last_payment_status,
      serverTime: row.server_time,
      blocked: row.blocked,
      blockedReason: row.blocked_reason,
      accessGrantActive: row.access_grant_active,
      accessGrantType: row.access_grant_type,
      accessGrantEnd: row.access_grant_end
    })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('get-entitlement error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível carregar sua licença agora.')
  }
})
