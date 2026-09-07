import { app } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { detectEdgeSilence, type SilenceTrimResult } from '../ffmpeg/silence'
import { probeVideoFile } from '../ffmpeg/probe'

type CacheMap = Record<string, SilenceTrimResult>

function cacheFilePath(): string {
  return join(app.getPath('userData'), 'silence-cache.json')
}

let memoryCache: CacheMap | null = null

async function loadCache(): Promise<CacheMap> {
  if (memoryCache) return memoryCache
  const path = cacheFilePath()
  if (!existsSync(path)) {
    memoryCache = {}
    return memoryCache
  }
  try {
    memoryCache = JSON.parse(await readFile(path, 'utf-8')) as CacheMap
  } catch {
    memoryCache = {}
  }
  return memoryCache
}

async function persistCache(cache: CacheMap): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(cacheFilePath(), JSON.stringify(cache), 'utf-8')
}

function buildCacheKey(filePath: string, size: number, mtimeMs: number): string {
  return `${filePath}|${size}|${Math.round(mtimeMs)}`
}

/**
 * Runs silencedetect at most once per (path, size, mtime) — reopening the
 * same file (unchanged on disk) reuses the cached trim points instead of
 * re-analyzing it for every job that references it.
 */
export async function getSilenceTrimCached(filePath: string): Promise<SilenceTrimResult> {
  const fileStat = await stat(filePath)
  const key = buildCacheKey(filePath, fileStat.size, fileStat.mtimeMs)
  const cache = await loadCache()

  const cached = cache[key]
  if (cached) return cached

  const probe = await probeVideoFile(filePath)
  const result = await detectEdgeSilence(filePath, probe.durationSeconds ?? 0)

  cache[key] = result
  memoryCache = cache
  await persistCache(cache)

  return result
}
