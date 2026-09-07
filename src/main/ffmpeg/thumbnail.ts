import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { getFfmpegPath } from './binaries'

/**
 * Extracts a single frame near the start of the video and returns it as a
 * base64 JPEG data URL. Failures are non-fatal: callers should treat a
 * thrown error as "no thumbnail available" and keep working.
 */
export async function generateThumbnailDataUrl(filePath: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'video-mixer-thumb-'))
  const outputPath = join(dir, `${randomUUID()}.jpg`)

  try {
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-ss', '0.3',
        '-i', filePath,
        '-frames:v', '1',
        '-vf', 'scale=240:-2',
        '-q:v', '4',
        outputPath
      ]
      execFile(getFfmpegPath(), args, { maxBuffer: 1024 * 1024 * 16 }, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })

    const buffer = await readFile(outputPath)
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
