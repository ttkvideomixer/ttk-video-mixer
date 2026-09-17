import { readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { SUPPORTED_AUDIO_SOURCE_EXTENSIONS, SUPPORTED_VIDEO_EXTENSIONS } from '@shared/defaults'
import { probeVideoFile } from '../ffmpeg/probe'

/** A video file is a valid audio source only if it actually has an audio stream — ffmpeg has nothing to reference otherwise. */
export async function hasUsableAudioStream(filePath: string): Promise<boolean> {
  if (!SUPPORTED_VIDEO_EXTENSIONS.includes(extname(filePath).toLowerCase())) return true
  try {
    const probe = await probeVideoFile(filePath)
    return probe.hasAudio
  } catch {
    return false
  }
}

export async function listAudioFilesInFolder(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const candidates = entries
    .filter((entry) => entry.isFile() && SUPPORTED_AUDIO_SOURCE_EXTENSIONS.includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(folderPath, entry.name))
  const usable = await Promise.all(candidates.map(async (path) => ((await hasUsableAudioStream(path)) ? path : null)))
  return usable.filter((path): path is string => path !== null)
}
