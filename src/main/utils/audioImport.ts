import { readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { SUPPORTED_AUDIO_EXTENSIONS } from '@shared/defaults'

export async function listAudioFilesInFolder(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_AUDIO_EXTENSIONS.includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(folderPath, entry.name))
}
