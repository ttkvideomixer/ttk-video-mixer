import { readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/defaults'

export async function listVideoFilesInFolder(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_VIDEO_EXTENSIONS.includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(folderPath, entry.name))
}
