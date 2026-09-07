import { describe, expect, it } from 'vitest'
import { balancedSequence, hashStringToSeed, seededShuffle } from './rng'

describe('seededShuffle', () => {
  it('is deterministic for the same seed', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    expect(seededShuffle(items, 7)).toEqual(seededShuffle(items, 7))
  })

  it('produces a different order for a different seed (almost always)', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2))
  })

  it('never adds or removes items', () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    const shuffled = seededShuffle(items, 99)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items)
  })
})

describe('balancedSequence', () => {
  it('gives every value an equal or near-equal share', () => {
    const values = ['a', 'b', 'c', 'd']
    const sequence = balancedSequence(values, 1000, 5)
    const counts = new Map<string, number>()
    for (const v of sequence) counts.set(v, (counts.get(v) ?? 0) + 1)
    for (const v of values) {
      expect(counts.get(v)).toBe(250)
    }
  })

  it('is deterministic for the same seed', () => {
    expect(balancedSequence([1, 2, 3], 30, 11)).toEqual(balancedSequence([1, 2, 3], 30, 11))
  })
})

describe('hashStringToSeed', () => {
  it('is deterministic', () => {
    expect(hashStringToSeed('hello')).toBe(hashStringToSeed('hello'))
  })

  it('differs for different input', () => {
    expect(hashStringToSeed('hello')).not.toBe(hashStringToSeed('world'))
  })
})
