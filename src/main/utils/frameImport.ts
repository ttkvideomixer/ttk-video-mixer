import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { app } from 'electron'
import { join, extname } from 'node:path'
import { SUPPORTED_FRAME_EXTENSIONS } from '@shared/defaults'

/**
 * Molduras ship bundled with the app (resources/frames via electron-builder's
 * extraResources) so the user just flips a checkbox instead of hunting down
 * and picking PNG files themselves.
 */
function bundledFramesDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'frames')
    : join(app.getAppPath(), 'resources', 'frames')
}

export async function listBundledFrames(): Promise<string[]> {
  const dir = bundledFramesDir()
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_FRAME_EXTENSIONS.includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(dir, entry.name))
}
