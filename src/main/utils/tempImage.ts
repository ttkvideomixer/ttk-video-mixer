import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Persists a renderer-rendered (Chromium canvas) overlay PNG to a temp file
 * so ffmpeg can reference it as a regular file input. One call = one fresh
 * temp file — callers that render the same content repeatedly should cache
 * the resulting path themselves (see the renderer's overlay-image cache)
 * rather than calling this again for identical bytes.
 */
export async function writeTempImageFile(bytes: Uint8Array): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'video-mixer-overlay-'))
  const filePath = join(dir, 'overlay.png')
  await writeFile(filePath, bytes)

  return {
    path: filePath,
    cleanup: () => rm(dir, { recursive: true, force: true })
  }
}
