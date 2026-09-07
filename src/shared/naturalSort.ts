/**
 * Compares two strings using natural order (gancho2 < gancho10),
 * instead of plain lexicographic order (gancho10 < gancho2).
 */
export function naturalCompare(a: string, b: string): number {
  const chunksA = a.match(/\d+|\D+/g) ?? [a]
  const chunksB = b.match(/\d+|\D+/g) ?? [b]
  const len = Math.max(chunksA.length, chunksB.length)

  for (let i = 0; i < len; i++) {
    const chunkA = chunksA[i]
    const chunkB = chunksB[i]

    if (chunkA === undefined) return -1
    if (chunkB === undefined) return 1

    const numA = Number(chunkA)
    const numB = Number(chunkB)
    const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB)

    if (bothNumeric) {
      if (numA !== numB) return numA - numB
    } else if (chunkA !== chunkB) {
      return chunkA.localeCompare(chunkB, undefined, { sensitivity: 'base' })
    }
  }

  return 0
}

export function naturalSortBy<T>(items: T[], getKey: (item: T) => string): T[] {
  return [...items].sort((a, b) => naturalCompare(getKey(a), getKey(b)))
}
