import { describe, expect, it } from 'vitest'
import {
  BILLING_ERROR_MESSAGES,
  TRIAL_DIMENSION,
  TRIAL_TOTAL_OUTPUTS,
  billingErrorMessage,
  extractBillingErrorCode
} from './billing'

describe('billingErrorMessage', () => {
  it('returns the Portuguese message for a known code', () => {
    expect(billingErrorMessage('TRIAL_EXHAUSTED')).toBe(BILLING_ERROR_MESSAGES.TRIAL_EXHAUSTED)
  })

  it('falls back to the generic server error message for an unknown code', () => {
    expect(billingErrorMessage('SOMETHING_UNKNOWN')).toBe(BILLING_ERROR_MESSAGES.SERVER_ERROR)
  })

  it('falls back to the generic server error message for null/undefined', () => {
    expect(billingErrorMessage(null)).toBe(BILLING_ERROR_MESSAGES.SERVER_ERROR)
    expect(billingErrorMessage(undefined)).toBe(BILLING_ERROR_MESSAGES.SERVER_ERROR)
  })
})

describe('extractBillingErrorCode', () => {
  it('finds a known code embedded in a raw error message', () => {
    expect(extractBillingErrorCode('TRIAL_EXHAUSTED')).toBe('TRIAL_EXHAUSTED')
  })

  it('finds a known code wrapped by Electron IPC error text', () => {
    const wrapped = "Error invoking remote method 'generateSingle': Error: SUBSCRIPTION_REQUIRED"
    expect(extractBillingErrorCode(wrapped)).toBe('SUBSCRIPTION_REQUIRED')
  })

  it('returns null when no known code is present', () => {
    expect(extractBillingErrorCode('some unrelated ffmpeg failure')).toBeNull()
  })

  it('returns null for null/undefined/empty input', () => {
    expect(extractBillingErrorCode(null)).toBeNull()
    expect(extractBillingErrorCode(undefined)).toBeNull()
    expect(extractBillingErrorCode('')).toBeNull()
  })
})

describe('trial constants', () => {
  it('derives the total trial outputs from the 3x3x3 dimension', () => {
    expect(TRIAL_DIMENSION).toBe(3)
    expect(TRIAL_TOTAL_OUTPUTS).toBe(27)
  })
})
