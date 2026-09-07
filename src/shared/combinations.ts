import type { Combination } from './types'
import { seededShuffle } from './rng'

/**
 * Generates the full cartesian product of hooks x bodies x ctas, in the
 * canonical order: hook is the outer loop, body the middle loop, cta the
 * inner loop. This guarantees hooks.length * bodies.length * ctas.length
 * combinations, each unique, none skipped.
 */
export function generateCombinations(
  hookCount: number,
  bodyCount: number,
  ctaCount: number
): Combination[] {
  const combinations: Combination[] = []

  if (hookCount <= 0 || bodyCount <= 0 || ctaCount <= 0) {
    return combinations
  }

  let index = 0
  for (let h = 0; h < hookCount; h++) {
    for (let b = 0; b < bodyCount; b++) {
      for (let c = 0; c < ctaCount; c++) {
        combinations.push({ index, hookIndex: h, bodyIndex: b, ctaIndex: c })
        index++
      }
    }
  }

  return combinations
}

export function calculateTotalCombinations(
  hookCount: number,
  bodyCount: number,
  ctaCount: number
): number {
  if (hookCount <= 0 || bodyCount <= 0 || ctaCount <= 0) return 0
  return hookCount * bodyCount * ctaCount
}

export function shuffleCombinations<T>(items: T[], seed = 42): T[] {
  return seededShuffle(items, seed)
}

/**
 * Picks `limit` items evenly spread across the full ordered set, so a
 * partial run still samples the whole matrix instead of only the first N
 * entries. Generic so it can sample plain combinations or combination+text
 * pairs (see jobBuilder) identically.
 */
export function sampleEvenly<T>(items: T[], limit: number): T[] {
  if (limit >= items.length) return [...items]
  if (limit <= 0) return []

  const step = items.length / limit
  const picked: T[] = []
  const seenIndexes = new Set<number>()

  for (let i = 0; i < limit; i++) {
    let sourceIndex = Math.floor(i * step)
    while (seenIndexes.has(sourceIndex) && sourceIndex < items.length - 1) {
      sourceIndex++
    }
    seenIndexes.add(sourceIndex)
    picked.push(items[sourceIndex])
  }

  return picked
}

/** @deprecated kept for backward compatibility, use {@link sampleEvenly} */
export const sampleCombinationsEvenly = sampleEvenly

export function selectCombinations<T>(
  items: T[],
  options: { mode: 'all' | 'limit'; maxCombinations: number | null; shuffle: boolean }
): T[] {
  let selected =
    options.mode === 'limit' && options.maxCombinations !== null
      ? sampleEvenly(items, options.maxCombinations)
      : [...items]

  if (options.shuffle) {
    selected = shuffleCombinations(selected)
  }

  return selected
}
