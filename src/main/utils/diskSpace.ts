import { statfs } from 'node:fs/promises'
import type { DiskSpaceInfo } from '@shared/types'

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/**
 * Best-effort free disk space lookup. Node's statfs is available on modern
 * Windows builds; if it ever throws (older runtime, exotic filesystem) we
 * fail soft with a zeroed result instead of blocking generation.
 */
export async function getDiskSpaceInfo(targetPath: string): Promise<DiskSpaceInfo> {
  try {
    const info = await statfs(targetPath)
    const freeBytes = info.bavail * info.bsize
    return { freeBytes, availableFormatted: formatBytes(freeBytes) }
  } catch {
    return { freeBytes: -1, availableFormatted: 'Desconhecido' }
  }
}
