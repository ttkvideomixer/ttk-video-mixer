/**
 * Deterministic pseudo-random generator (mulberry32). Used everywhere a
 * "random-looking but reproducible" choice is needed (shuffle order,
 * creative variation parameters, hook-text/CTA-phrase distribution) so the
 * same project + seed always yields the same result across app restarts.
 */
export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Turns an arbitrary string into a 32-bit integer seed (FNV-1a). */
export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Deterministic in-place-safe shuffle driven by a numeric seed. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items]
  const random = mulberry32(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Builds a `count`-long sequence drawing from `values` so every value is
 * used an equal (or near-equal) number of times overall, instead of pure
 * independent random picks which tend to clump ("900 videos with zoom
 * 1.05"). Each full pass through the value set is shuffled independently
 * (seeded), so the sequence still looks unpredictable locally.
 */
export function balancedSequence<T>(values: readonly T[], count: number, seed: number): T[] {
  if (values.length === 0 || count <= 0) return []
  const result: T[] = []
  let cycle = 0
  while (result.length < count) {
    result.push(...seededShuffle(values, seed + cycle * 97 + 1))
    cycle++
  }
  return result.slice(0, count)
}
