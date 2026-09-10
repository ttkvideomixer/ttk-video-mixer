import { readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { SUPPORTED_FRAME_EXTENSIONS } from '@shared/defaults'

export async function listFrameFilesInFolder(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_FRAME_EXTENSIONS.includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(folderPath, entry.name))
}
