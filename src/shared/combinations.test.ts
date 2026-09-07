import { describe, expect, it } from 'vitest'
import {
  calculateTotalCombinations,
  generateCombinations,
  sampleCombinationsEvenly,
  selectCombinations,
  shuffleCombinations
} from './combinations'

describe('generateCombinations', () => {
  it('returns hooks x bodies x ctas combinations', () => {
    const result = generateCombinations(2, 3, 4)
    expect(result).toHaveLength(24)
    expect(calculateTotalCombinations(2, 3, 4)).toBe(24)
  })

  it('returns the classic 10x10x10 = 1000 case', () => {
    expect(generateCombinations(10, 10, 10)).toHaveLength(1000)
  })

  it('supports non-square combinations like 5x7x3 = 105', () => {
    expect(generateCombinations(5, 7, 3)).toHaveLength(105)
  })

  it('returns an empty array when any group is empty', () => {
    expect(generateCombinations(0, 5, 5)).toHaveLength(0)
    expect(generateCombinations(5, 0, 5)).toHaveLength(0)
    expect(generateCombinations(5, 5, 0)).toHaveLength(0)
  })

  it('never produces a duplicate combination', () => {
    const result = generateCombinations(4, 4, 4)
    const seen = new Set(result.map((c) => `${c.hookIndex}-${c.bodyIndex}-${c.ctaIndex}`))
    expect(seen.size).toBe(result.length)
  })

  it('iterates hook outer, body middle, cta inner, in order', () => {
    const result = generateCombinations(2, 2, 2)
    expect(result.map((c) => [c.hookIndex, c.bodyIndex, c.ctaIndex])).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1]
    ])
  })

  it('covers every combination without skipping any', () => {
    const result = generateCombinations(3, 3, 3)
    for (let h = 0; h < 3; h++) {
      for (let b = 0; b < 3; b++) {
        for (let c = 0; c < 3; c++) {
          expect(
            result.some((x) => x.hookIndex === h && x.bodyIndex === b && x.ctaIndex === c)
          ).toBe(true)
        }
      }
    }
  })
})

describe('shuffleCombinations', () => {
  it('keeps the same set of combinations, only reordered', () => {
    const original = generateCombinations(3, 3, 3)
    const shuffled = shuffleCombinations(original, 7)
    expect(shuffled).toHaveLength(original.length)
    const originalKeys = new Set(original.map((c) => c.index))
    const shuffledKeys = new Set(shuffled.map((c) => c.index))
    expect(shuffledKeys).toEqual(originalKeys)
  })

  it('is deterministic for a given seed', () => {
    const original = generateCombinations(4, 4, 4)
    const a = shuffleCombinations(original, 123)
    const b = shuffleCombinations(original, 123)
    expect(a).toEqual(b)
  })
})

describe('sampleCombinationsEvenly', () => {
  it('returns exactly the requested amount when smaller than the total', () => {
    const all = generateCombinations(10, 10, 10)
    const sample = sampleCombinationsEvenly(all, 100)
    expect(sample).toHaveLength(100)
  })

  it('never picks the same combination twice', () => {
    const all = generateCombinations(10, 10, 10)
    const sample = sampleCombinationsEvenly(all, 137)
    const seen = new Set(sample.map((c) => c.index))
    expect(seen.size).toBe(sample.length)
  })

  it('returns everything when the limit is above the total', () => {
    const all = generateCombinations(2, 2, 2)
    expect(sampleCombinationsEvenly(all, 999)).toHaveLength(8)
  })
})

describe('selectCombinations', () => {
  it('applies limit before shuffle and keeps uniqueness', () => {
    const all = generateCombinations(10, 10, 10)
    const result = selectCombinations(all, { mode: 'limit', maxCombinations: 50, shuffle: true })
    expect(result).toHaveLength(50)
    expect(new Set(result.map((c) => c.index)).size).toBe(50)
  })

  it('returns all combinations when mode is "all"', () => {
    const all = generateCombinations(3, 3, 3)
    const result = selectCombinations(all, { mode: 'all', maxCombinations: null, shuffle: false })
    expect(result).toHaveLength(27)
  })
})
