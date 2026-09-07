import { describe, expect, it } from 'vitest'
import { CTA_PHRASES, distributeCtaPhrases, distributeEvenly } from './ctaPhrases'

describe('CTA_PHRASES', () => {
  it('has at least 100 phrases, all non-empty', () => {
    expect(CTA_PHRASES.length).toBeGreaterThanOrEqual(100)
    for (const phrase of CTA_PHRASES) {
      expect(phrase.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('distributeEvenly', () => {
  it('never repeats the same value on two consecutive slots when more than one value exists', () => {
    const values = ['a', 'b', 'c']
    const sequence = distributeEvenly(values, 300, 3)
    for (let i = 1; i < sequence.length; i++) {
      expect(sequence[i]).not.toBe(sequence[i - 1])
    }
  })

  it('distributes near-evenly', () => {
    const values = ['a', 'b']
    const sequence = distributeEvenly(values, 1000, 9)
    const countA = sequence.filter((v) => v === 'a').length
    expect(countA).toBeGreaterThan(400)
    expect(countA).toBeLessThan(600)
  })
})

describe('distributeCtaPhrases', () => {
  it('returns exactly `count` phrases from the bank', () => {
    const result = distributeCtaPhrases(50, 1)
    expect(result).toHaveLength(50)
    for (const phrase of result) {
      expect(CTA_PHRASES).toContain(phrase)
    }
  })
})
