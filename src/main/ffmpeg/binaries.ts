import { existsSync } from 'node:fs'
import ffmpegStaticPath from 'ffmpeg-static'
// eslint-disable-next-line @typescript-eslint/no-var-requires
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import type { FfmpegStatus } from '@shared/types'

/**
 * ffmpeg-static / ffprobe-installer resolve their binary path relative to
 * node_modules. When the app is packaged inside an asar archive, that path
 * points *inside* the archive, where the OS cannot execute the binary from.
 * electron-builder is configured to unpack these two packages
 * (see package.json -> build.asarUnpack), so on disk the real file lives at
 * the same path with "app.asar" swapped for "app.asar.unpacked".
 */
function toUnpackedPath(possiblyAsarPath: string): string {
  if (possiblyAsarPath.includes('app.asar') && !possiblyAsarPath.includes('app.asar.unpacked')) {
    return possiblyAsarPath.replace('app.asar', 'app.asar.unpacked')
  }
  return possiblyAsarPath
}

let cachedStatus: FfmpegStatus | null = null

export function resolveFfmpegPaths(): FfmpegStatus {
  if (cachedStatus) return cachedStatus

  const rawFfmpegPath = ffmpegStaticPath as unknown as string
  const rawFfprobePath = ffprobeInstaller.path

  const ffmpegPath = rawFfmpegPath ? toUnpackedPath(rawFfmpegPath) : null
  const ffprobePath = rawFfprobePath ? toUnpackedPath(rawFfprobePath) : null

  const ffmpegOk = !!ffmpegPath && existsSync(ffmpegPath)
  const ffprobeOk = !!ffprobePath && existsSync(ffprobePath)

  if (ffmpegOk && ffprobeOk) {
    cachedStatus = {
      ready: true,
      ffmpegPath,
      ffprobePath,
      message: 'FFmpeg pronto.'
    }
  } else {
    const missing = [!ffmpegOk ? 'ffmpeg' : null, !ffprobeOk ? 'ffprobe' : null]
      .filter(Boolean)
      .join(' e ')
    cachedStatus = {
      ready: false,
      ffmpegPath: ffmpegOk ? ffmpegPath : null,
      ffprobePath: ffprobeOk ? ffprobePath : null,
      message: `FFmpeg nao encontrado (${missing}). Reinstale o aplicativo.`
    }
  }

  return cachedStatus
}

export function getFfmpegPath(): string {
  const status = resolveFfmpegPaths()
  if (!status.ffmpegPath) throw new Error(status.message)
  return status.ffmpegPath
}

export function getFfprobePath(): string {
  const status = resolveFfmpegPaths()
  if (!status.ffprobePath) throw new Error(status.message)
  return status.ffprobePath
}
