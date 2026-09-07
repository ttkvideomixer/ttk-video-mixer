import { describe, expect, it } from 'vitest'
import { calculateCombinations, getCombinationMilestone } from './combinations'

describe('calculateCombinations', () => {
  it('multiplies the three groups', () => {
    expect(calculateCombinations(10, 10, 10)).toBe(1000)
    expect(calculateCombinations(3, 3, 3)).toBe(27)
  })

  it('returns 0 when any group is empty', () => {
    expect(calculateCombinations(0, 5, 5)).toBe(0)
    expect(calculateCombinations(5, 0, 5)).toBe(0)
  })

  it('never goes negative or fractional', () => {
    expect(calculateCombinations(-3, 5, 5)).toBe(0)
    expect(calculateCombinations(2.9, 5, 5)).toBe(50)
  })
})

describe('getCombinationMilestone', () => {
  it('returns null below 100', () => {
    expect(getCombinationMilestone(99)).toBeNull()
  })

  it('returns lote at 100', () => {
    expect(getCombinationMilestone(100)).toBe('lote')
  })

  it('returns biblioteca at 500', () => {
    expect(getCombinationMilestone(500)).toBe('biblioteca')
  })

  it('returns escala at 1000', () => {
    expect(getCombinationMilestone(1000)).toBe('escala')
  })
})
