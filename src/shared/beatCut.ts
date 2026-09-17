import type { BeatGrid, BeatTransitionStyle } from './types'
import { mulberry32, seededShuffle } from './rng'

/** Below this, a chunk is too short for an xfade transition to look clean — merge it into its neighbor instead. */
const MIN_CHUNK_SECONDS = 0.12

export interface ChunkPlan {
  /** [0, t1, ..., tK] in seconds, within the segment's own local timeline. */
  boundaries: number[]
  /** Permutation of 0..K-1 — the order chunks are played in (source-time order stays intact, only playback order changes). */
  order: number[]
  /** One style per internal join, length === order.length - 1. */
  transitions: BeatTransitionStyle[]
}

/**
 * Cut points for one segment, either snapped to a detected beat grid (when a
 * track is attached and analyzed) or evenly spaced (no track / no beat cut
 * without music). `cumulativeOffset` is this segment's start position in the
 * overall concatenated timeline — only meaningful when `beatGrid` comes from
 * a track spanning the WHOLE video ("fullTracks"), so a beat's absolute time
 * can be translated into this segment's own local [0, segmentDuration]
 * window; pass 0 for a per-category track (already trimmed to start at this
 * segment's own t=0).
 */
export function resolveBeatBoundaries(
  beatGrid: BeatGrid | null,
  fallbackChunkCount: number,
  segmentDuration: number,
  cumulativeOffset = 0
): number[] {
  if (segmentDuration <= 0) return [0, segmentDuration]
  const raw = beatGrid
    ? beatBoundariesFromGrid(beatGrid, segmentDuration, cumulativeOffset)
    : evenBoundaries(fallbackChunkCount, segmentDuration)
  return sanitizeBoundaries(raw, segmentDuration)
}

function evenBoundaries(chunkCount: number, segmentDuration: number): number[] {
  const k = Math.max(1, Math.floor(chunkCount))
  return Array.from({ length: k + 1 }, (_, n) => (segmentDuration * n) / k)
}

function beatBoundariesFromGrid(grid: BeatGrid, segmentDuration: number, cumulativeOffset: number): number[] {
  const interval = 60 / grid.bpm
  const windowStart = cumulativeOffset
  const windowEnd = windowStart + segmentDuration
  const boundaries = [0]
  let n = Math.ceil((windowStart - grid.offsetSeconds) / interval)
  if (n < 0) n = 0
  for (let guard = 0; guard < 100_000; guard++) {
    const t = grid.offsetSeconds + n * interval
    if (t >= windowEnd) break
    if (t > windowStart) boundaries.push(t - windowStart)
    n++
  }
  boundaries.push(segmentDuration)
  return boundaries
}

function sanitizeBoundaries(boundaries: number[], segmentDuration: number): number[] {
  const sorted = [...new Set(boundaries.map((b) => Math.max(0, Math.min(segmentDuration, b))))].sort((a, b) => a - b)
  const merged: number[] = [0]
  for (const b of sorted) {
    if (b - merged[merged.length - 1] >= MIN_CHUNK_SECONDS) merged.push(b)
  }
  if (merged.length === 1 || merged[merged.length - 1] < segmentDuration - 0.001) {
    merged.push(segmentDuration)
  } else {
    merged[merged.length - 1] = segmentDuration
  }
  return merged
}

/** Prefix sums of `durations` — durations[i]'s own start position in the concatenated timeline. */
export function prefixSums(durations: number[]): number[] {
  const sums: number[] = []
  let acc = 0
  for (const d of durations) {
    sums.push(acc)
    acc += d
  }
  return sums
}

/**
 * Builds the shuffle order + per-cut transition styles for one segment.
 * Returns null when there aren't at least 2 chunks — nothing to shuffle, the
 * caller should skip Beat Cut for that segment/job entirely (no error).
 */
export function buildChunkPlan(boundaries: number[], seed: number, allowedTransitions: BeatTransitionStyle[]): ChunkPlan | null {
  const chunkCount = boundaries.length - 1
  if (chunkCount < 2) return null

  const identity = Array.from({ length: chunkCount }, (_, i) => i)
  let order = seededShuffle(identity, seed)
  let attempt = 0
  while (isIdentity(order, identity) && attempt < 8) {
    attempt++
    order = seededShuffle(identity, seed + 97 * attempt)
  }

  const styles = allowedTransitions.length > 0 ? allowedTransitions : ['fade' as const]
  const pickStyle = mulberry32(seed + 51)
  const transitions = Array.from({ length: chunkCount - 1 }, () => styles[Math.floor(pickStyle() * styles.length)])

  return { boundaries, order, transitions }
}

function isIdentity(order: number[], identity: number[]): boolean {
  return order.every((value, i) => value === identity[i])
}
