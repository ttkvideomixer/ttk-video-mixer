import { describe, expect, it } from 'vitest'
import { buildVideoMixerId } from './videoMixerId'

describe('buildVideoMixerId', () => {
  it('builds a zero-padded, 1-based id', () => {
    expect(buildVideoMixerId(0, 1000)).toBe('VM-000001')
    expect(buildVideoMixerId(999, 1000)).toBe('VM-001000')
  })

  it('grows width for very large totals', () => {
    expect(buildVideoMixerId(0, 1234567)).toBe('VM-0000001')
    expect(buildVideoMixerId(0, 12000)).toBe('VM-000001')
  })
})
