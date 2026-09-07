import { describe, expect, it } from 'vitest'
import { averageHashHex, hammingDistanceHex } from './fingerprint'

describe('averageHashHex', () => {
  it('is deterministic for the same pixels', () => {
    const pixels = Buffer.from(Array.from({ length: 64 }, (_, i) => (i * 4) % 256))
    expect(averageHashHex(pixels)).toBe(averageHashHex(Buffer.from(pixels)))
  })

  it('produces different hashes for clearly different images', () => {
    const gradient = Buffer.from(Array.from({ length: 64 }, (_, i) => i * 4))
    const checkerboard = Buffer.from(Array.from({ length: 64 }, (_, i) => (i % 2 === 0 ? 0 : 255)))
    expect(averageHashHex(gradient)).not.toBe(averageHashHex(checkerboard))
  })
})

describe('hammingDistanceHex', () => {
  it('is 0 for identical fingerprints', () => {
    expect(hammingDistanceHex('a1b2c3', 'a1b2c3')).toBe(0)
  })

  it('is positive for different fingerprints', () => {
    expect(hammingDistanceHex('0000', 'ffff')).toBe(16)
  })

  it('treats mismatched lengths as maximally different', () => {
    expect(hammingDistanceHex('00', '000')).toBe(Number.MAX_SAFE_INTEGER)
  })
})
