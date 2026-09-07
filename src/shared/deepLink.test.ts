import { describe, expect, it } from 'vitest'
import { isBillingSuccessUrl, parseAuthCallbackUrl } from './deepLink'

describe('parseAuthCallbackUrl', () => {
  it('extracts the code from a valid callback URL', () => {
    expect(parseAuthCallbackUrl('videomixer://auth/callback?code=abc123')).toEqual({ code: 'abc123' })
  })

  it('rejects a different scheme', () => {
    expect(parseAuthCallbackUrl('http://auth/callback?code=abc123')).toBeNull()
  })

  it('rejects a different host', () => {
    expect(parseAuthCallbackUrl('videomixer://evil/callback?code=abc123')).toBeNull()
  })

  it('rejects a different path', () => {
    expect(parseAuthCallbackUrl('videomixer://auth/other?code=abc123')).toBeNull()
  })

  it('rejects a missing code', () => {
    expect(parseAuthCallbackUrl('videomixer://auth/callback')).toBeNull()
  })

  it('rejects a malformed URL', () => {
    expect(parseAuthCallbackUrl('not a url')).toBeNull()
  })
})

describe('isBillingSuccessUrl', () => {
  it('accepts the exact expected URL', () => {
    expect(isBillingSuccessUrl('videomixer://billing/success')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isBillingSuccessUrl('videomixer://auth/callback')).toBe(false)
    expect(isBillingSuccessUrl('videomixer://billing/failure')).toBe(false)
  })
})
