/** Builds a stable, human-readable unique id like "VM-000001", width matched to the total count. */
export function buildVideoMixerId(index0Based: number, total: number): string {
  const width = Math.max(6, String(total).length)
  return `VM-${String(index0Based + 1).padStart(width, '0')}`
}
