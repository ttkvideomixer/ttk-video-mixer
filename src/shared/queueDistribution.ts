/**
 * Reorders items so runs of the same `groupKey` (e.g. the same hook) are
 * spread out instead of appearing consecutively — without adding, removing,
 * or duplicating any item, and preserving each group's relative order.
 *
 * Greedy strategy: at each step, place an item from the largest remaining
 * bucket that isn't the bucket just used (falling back to repeating only
 * when no other bucket has items left — which is mathematically
 * unavoidable once one group holds more than half of what remains).
 *
 * This only changes processing/queue order; it never changes which
 * combinations exist or their output file names.
 */
export function roundRobinByGroup<T>(items: T[], groupKey: (item: T) => string): T[] {
  const buckets = new Map<string, T[]>()

  for (const item of items) {
    const key = groupKey(item)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }

  const keys = [...buckets.keys()]
  const result: T[] = []
  let lastKey: string | null = null

  while (result.length < items.length) {
    const hasAlternative = keys.some((k) => k !== lastKey && (buckets.get(k)?.length ?? 0) > 0)

    let bestKey: string | null = null
    let bestCount = -1
    for (const key of keys) {
      const bucket = buckets.get(key)
      if (!bucket || bucket.length === 0) continue
      if (key === lastKey && hasAlternative) continue
      if (bucket.length > bestCount) {
        bestCount = bucket.length
        bestKey = key
      }
    }

    if (bestKey === null) break // no items left anywhere

    const chosen = buckets.get(bestKey) as T[]
    result.push(chosen.shift() as T)
    lastKey = bestKey
  }

  return result
}
