import { spawn } from 'node:child_process'
import { getFfmpegPath } from './binaries'

export interface SilenceTrimResult {
  trimStartMs: number
  trimEndMs: number
}

const NOISE_THRESHOLD_DB = -38
const MIN_SILENCE_SECONDS = 0.2
const START_MARGIN_MS = 100 // keep 80-120ms of the detected speech start
const END_MARGIN_MS = 130 // keep 100-150ms of the detected speech end
const NO_TRIM: SilenceTrimResult = { trimStartMs: 0, trimEndMs: 0 }

interface SilenceEvent {
  start: number
  end: number
}

function runSilenceDetect(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', filePath,
      '-af', `silencedetect=noise=${NOISE_THRESHOLD_DB}dB:d=${MIN_SILENCE_SECONDS}`,
      '-f', 'null',
      '-'
    ]
    const child = spawn(getFfmpegPath(), args, { windowsHide: true })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', () => resolve(stderr))
  })
}

function parseSilenceEvents(stderr: string): SilenceEvent[] {
  const events: SilenceEvent[] = []
  const regex = /silence_(start|end):\s*(-?[\d.]+)/g
  let pendingStart: number | null = null
  let match: RegExpExecArray | null

  while ((match = regex.exec(stderr)) !== null) {
    const value = Number(match[2])
    if (match[1] === 'start') {
      pendingStart = value
    } else if (pendingStart !== null) {
      events.push({ start: pendingStart, end: value })
      pendingStart = null
    }
  }

  return events
}

/**
 * Detects near-silent stretches right at the start and end of a clip and
 * proposes safe trim points, keeping a margin so speech is never clipped.
 * Never throws — an inconclusive analysis just means "don't trim".
 */
export async function detectEdgeSilence(filePath: string, durationSeconds: number): Promise<SilenceTrimResult> {
  if (!(durationSeconds > 0.5)) return NO_TRIM

  try {
    const stderr = await runSilenceDetect(filePath)
    const events = parseSilenceEvents(stderr)
    if (events.length === 0) return NO_TRIM

    let trimStartMs = 0
    const leading = events.find((e) => e.start <= 0.05)
    if (leading) {
      trimStartMs = Math.max(0, leading.end * 1000 - START_MARGIN_MS)
    }

    let trimEndMs = 0
    const trailing = [...events].reverse().find((e) => e.end >= durationSeconds - 0.05)
    if (trailing) {
      trimEndMs = Math.max(0, durationSeconds * 1000 - trailing.start * 1000 - END_MARGIN_MS)
    }

    const totalMs = durationSeconds * 1000
    if (trimStartMs + trimEndMs >= totalMs * 0.8) {
      // Something looks off (e.g. an almost entirely silent clip) — safer not to trim.
      return NO_TRIM
    }

    return { trimStartMs: Math.round(trimStartMs), trimEndMs: Math.round(trimEndMs) }
  } catch {
    return NO_TRIM
  }
}
