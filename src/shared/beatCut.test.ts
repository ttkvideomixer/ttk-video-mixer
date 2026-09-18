import { describe, expect, it } from 'vitest'
import { buildChunkPlan, prefixSums, resolveBeatBoundaries } from './beatCut'
import type { BeatTransitionStyle } from './types'

describe('resolveBeatBoundaries', () => {
  it('splits evenly into fallbackChunkCount pieces when there is no beat grid', () => {
    const boundaries = resolveBeatBoundaries(null, 4, 4)
    expect(boundaries).toEqual([0, 1, 2, 3, 4])
  })

  it('falls back to at least 1 chunk when fallbackChunkCount is 0 or negative', () => {
    expect(resolveBeatBoundaries(null, 0, 3)).toEqual([0, 3])
    expect(resolveBeatBoundaries(null, -2, 3)).toEqual([0, 3])
  })

  it('snaps boundaries to a 120bpm grid (0.5s interval) starting at offset 0', () => {
    const boundaries = resolveBeatBoundaries({ bpm: 120, offsetSeconds: 0 }, 4, 3)
    expect(boundaries).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3])
  })

  it('shifts the grid by cumulativeOffset for a full-span track driving a later segment', () => {
    // Segment starts at t=2 in the overall timeline (e.g. after a 2s hook), lasts 1s.
    // Beats at 0, 0.5, 1, 1.5, 2, 2.5, 3... -> within [2,3) only 2.0 and 2.5 land, at local 0 and 0.5.
    const boundaries = resolveBeatBoundaries({ bpm: 120, offsetSeconds: 0 }, 4, 1, 2)
    expect(boundaries).toEqual([0, 0.5, 1])
  })

  it('merges beats closer together than the minimum chunk length', () => {
    // 600bpm -> 0.1s interval, well under the 0.35s minimum chunk size.
    const boundaries = resolveBeatBoundaries({ bpm: 600, offsetSeconds: 0 }, 4, 1)
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i] - boundaries[i - 1]).toBeGreaterThanOrEqual(0.35 - 1e-9)
    }
    expect(boundaries[0]).toBe(0)
    expect(boundaries[boundaries.length - 1]).toBe(1)
  })

  it('handles a zero-duration segment without throwing', () => {
    expect(resolveBeatBoundaries(null, 4, 0)).toEqual([0, 0])
  })
})

describe('buildChunkPlan', () => {
  const styles: BeatTransitionStyle[] = ['fade', 'wipeleft', 'dissolve']

  it('returns null when there are fewer than 2 chunks', () => {
    expect(buildChunkPlan([0, 3], 42, styles)).toBeNull()
  })

  it('returns a non-identity order for 2+ chunks', () => {
    const boundaries = [0, 1, 2, 3, 4]
    const plan = buildChunkPlan(boundaries, 42, styles)
    expect(plan).not.toBeNull()
    expect(plan!.order.slice().sort()).toEqual([0, 1, 2, 3])
    expect(plan!.order).not.toEqual([0, 1, 2, 3])
  })

  it('produces one transition per internal join, all from the allowed list', () => {
    const boundaries = [0, 1, 2, 3, 4]
    const plan = buildChunkPlan(boundaries, 7, styles)
    expect(plan!.transitions).toHaveLength(3)
    for (const t of plan!.transitions) expect(styles).toContain(t)
  })

  it('is deterministic for the same seed', () => {
    const boundaries = [0, 1, 2, 3]
    const a = buildChunkPlan(boundaries, 99, styles)
    const b = buildChunkPlan(boundaries, 99, styles)
    expect(a).toEqual(b)
  })

  it('falls back to fade when allowedTransitions is empty', () => {
    const plan = buildChunkPlan([0, 1, 2, 3], 5, [])
    expect(plan!.transitions.every((t) => t === 'fade')).toBe(true)
  })
})

describe('prefixSums', () => {
  it('returns each duration\'s own start offset', () => {
    expect(prefixSums([3, 5, 2])).toEqual([0, 3, 8])
  })

  it('returns an empty array for an empty input', () => {
    expect(prefixSums([])).toEqual([])
  })
})
