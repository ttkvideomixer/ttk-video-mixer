import { execFile } from 'node:child_process'
import { getFfprobePath } from './binaries'

export interface ProbeResult {
  durationSeconds: number | null
  width: number | null
  height: number | null
  fps: number | null
  hasAudio: boolean
  hasVideo: boolean
}

interface FfprobeStream {
  codec_type: 'video' | 'audio' | string
  width?: number
  height?: number
  r_frame_rate?: string
  avg_frame_rate?: string
  duration?: string
  tags?: { rotate?: string }
}

interface FfprobeFormat {
  duration?: string
}

interface FfprobeOutput {
  streams?: FfprobeStream[]
  format?: FfprobeFormat
}

function parseFrameRate(rate: string | undefined): number | null {
  if (!rate) return null
  const [num, den] = rate.split('/').map(Number)
  if (!den) return num || null
  if (den === 0) return null
  const fps = num / den
  return Number.isFinite(fps) && fps > 0 ? fps : null
}

function runFfprobe(filePath: string): Promise<FfprobeOutput> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]

    execFile(getFfprobePath(), args, { maxBuffer: 1024 * 1024 * 16 }, (error, stdout) => {
      if (error) {
        reject(new Error(`ffprobe falhou: ${error.message}`))
        return
      }
      try {
        resolve(JSON.parse(stdout) as FfprobeOutput)
      } catch {
        reject(new Error('Nao foi possivel interpretar a saida do ffprobe.'))
      }
    })
  })
}

export async function probeVideoFile(filePath: string): Promise<ProbeResult> {
  const data = await runFfprobe(filePath)
  const streams = data.streams ?? []
  const videoStream = streams.find((s) => s.codec_type === 'video')
  const audioStream = streams.find((s) => s.codec_type === 'audio')

  const formatDuration = data.format?.duration ? Number(data.format.duration) : null
  const streamDuration = videoStream?.duration ? Number(videoStream.duration) : null
  const durationSeconds = formatDuration ?? streamDuration ?? null

  return {
    durationSeconds: durationSeconds && Number.isFinite(durationSeconds) ? durationSeconds : null,
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    fps: parseFrameRate(videoStream?.avg_frame_rate) ?? parseFrameRate(videoStream?.r_frame_rate),
    hasAudio: !!audioStream,
    hasVideo: !!videoStream
  }
}
