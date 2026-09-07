/**
 * Stable machine-readable error codes. The desktop app maps these to
 * Portuguese, user-facing copy (see src/shared/billingErrors.ts) — never
 * send raw gateway/database error text to the renderer.
 */
export const ErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TRIAL_EXHAUSTED: 'TRIAL_EXHAUSTED',
  TRIAL_NOT_ELIGIBLE: 'TRIAL_NOT_ELIGIBLE',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_PAST_DUE: 'SUBSCRIPTION_PAST_DUE',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  DEVICE_LIMIT: 'DEVICE_LIMIT',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  NETWORK_REQUIRED: 'NETWORK_REQUIRED',
  LICENSE_INVALID: 'LICENSE_INVALID',
  INVALID_REQUEST: 'INVALID_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR'
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

import { corsHeaders } from './cors.ts'

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

export function errorResponse(status: number, code: ErrorCode, message: string): Response {
  return jsonResponse({ error: { code, message } }, status)
}
