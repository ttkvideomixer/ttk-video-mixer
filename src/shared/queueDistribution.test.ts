import { describe, expect, it } from 'vitest'
import { roundRobinByGroup } from './queueDistribution'

describe('roundRobinByGroup', () => {
  it('spreads out a dominant group instead of leaving it consecutive', () => {
    const items = [
      { hook: 'G01', body: 'C01' },
      { hook: 'G01', body: 'C02' },
      { hook: 'G01', body: 'C03' },
      { hook: 'G02', body: 'C01' },
      { hook: 'G03', body: 'C01' }
    ]
    const result = roundRobinByGroup(items, (i) => i.hook)
    let maxConsecutive = 1
    let current = 1
    for (let i = 1; i < result.length; i++) {
      if (result[i].hook === result[i - 1].hook) {
        current++
        maxConsecutive = Math.max(maxConsecutive, current)
      } else {
        current = 1
      }
    }
    expect(maxConsecutive).toBe(1)
  })

  it('never adds, removes or duplicates items', () => {
    const items = Array.from({ length: 37 }, (_, i) => ({ id: i, group: `G${i % 5}` }))
    const result = roundRobinByGroup(items, (i) => i.group)
    expect(result).toHaveLength(items.length)
    expect(new Set(result.map((i) => i.id))).toEqual(new Set(items.map((i) => i.id)))
  })

  it('preserves relative order within a group', () => {
    const items = [
      { id: 1, group: 'A' },
      { id: 2, group: 'A' },
      { id: 3, group: 'B' },
      { id: 4, group: 'A' }
    ]
    const result = roundRobinByGroup(items, (i) => i.group)
    const groupAOrder = result.filter((i) => i.group === 'A').map((i) => i.id)
    expect(groupAOrder).toEqual([1, 2, 4])
  })
})
