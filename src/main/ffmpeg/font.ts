import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let cachedFontPath: string | null = null

/**
 * Resolves the bundled Poppins ExtraBold font used for hook-text and
 * visual-CTA overlays, so rendering never depends on a font being
 * installed on the user's machine. Packaged builds ship it under
 * resources/fonts via electron-builder's extraResources; in dev it's read
 * straight from the repo.
 */
export function getBundledFontPath(): string {
  if (cachedFontPath) return cachedFontPath

  const candidate = app.isPackaged
    ? join(process.resourcesPath, 'fonts', 'Poppins-ExtraBold.ttf')
    : join(app.getAppPath(), 'resources', 'fonts', 'Poppins-ExtraBold.ttf')

  if (!existsSync(candidate)) {
    throw new Error(`Fonte do aplicativo nao encontrada em: ${candidate}`)
  }

  cachedFontPath = candidate
  return cachedFontPath
}
