import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface TempTextFile {
  path: string
  cleanup: () => Promise<void>
}

/**
 * Writes drawtext content to a temporary UTF-8 file instead of inlining it
 * into the filter string. This is the safe way to hand ffmpeg text that may
 * contain accents, punctuation, colons or quotes without hand-escaping a
 * shell/filter string ourselves (see project rule on safe text handling).
 */
export async function writeTempTextFile(lines: string[]): Promise<TempTextFile> {
  const dir = await mkdtemp(join(tmpdir(), 'video-mixer-text-'))
  const filePath = join(dir, 'overlay.txt')
  await writeFile(filePath, lines.join('\n'), 'utf-8')

  return {
    path: filePath,
    cleanup: () => rm(dir, { recursive: true, force: true })
  }
}
