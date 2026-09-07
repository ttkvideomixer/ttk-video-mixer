import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export interface LocalInstaller {
  absolutePath: string
  fileName: string
  sizeBytes: number
}

/**
 * Local-only convenience so the download flow is actually clickable while
 * developing before any GitHub release exists: looks for the real installer
 * this monorepo's desktop app already builds into ../release (see
 * video-mixer/package.json "dist" script) and serves that exact file.
 * Never used in production — GitHub Releases is the only source of truth
 * once deployed (see resolveDownload in ./download.ts).
 */
export function findLocalWindowsInstaller(): LocalInstaller | null {
  if (process.env.NODE_ENV === 'production') return null

  const configuredDir = process.env.DEV_LOCAL_WINDOWS_INSTALLER_PATH?.trim()
  if (!configuredDir) return null

  const dir = resolve(process.cwd(), configuredDir)
  if (!existsSync(dir)) return null

  const candidates = readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.exe'))
  if (candidates.length === 0) return null

  const fileName = candidates[0] as string
  const absolutePath = join(dir, fileName)
  return { absolutePath, fileName, sizeBytes: statSync(absolutePath).size }
}
