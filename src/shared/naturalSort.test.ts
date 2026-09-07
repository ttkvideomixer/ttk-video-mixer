import { describe, expect, it } from 'vitest'
import { naturalSortBy } from './naturalSort'

describe('naturalSortBy', () => {
  it('orders numeric suffixes naturally instead of lexicographically', () => {
    const items = ['gancho10.mp4', 'gancho2.mp4', 'gancho1.mp4']
    expect(naturalSortBy(items, (x) => x)).toEqual(['gancho1.mp4', 'gancho2.mp4', 'gancho10.mp4'])
  })

  it('handles mixed prefixes consistently', () => {
    const items = ['corpo9', 'corpo10', 'corpo1', 'corpo2']
    expect(naturalSortBy(items, (x) => x)).toEqual(['corpo1', 'corpo2', 'corpo9', 'corpo10'])
  })
})
