import { guess } from 'web-audio-beat-detector'
import type { BeatGrid } from '@shared/types'
import { toMediaUrl } from '@shared/mediaUrl'

/**
 * Detected beat grids, keyed by file path — decoding + analysis takes real
 * time (seconds), and the same track is reused across many jobs, so this
 * never runs twice for the same file within one app session.
 */
const cache = new Map<string, Promise<BeatGrid | null>>()

/**
 * Assumes constant tempo (grid = offsetSeconds + n*(60/bpm)) — good enough
 * for the steady-beat trending audio this feature targets; deliberately not
 * a full dynamic tempo-tracker. Returns null on any failure (corrupt file,
 * a video whose audio codec Web Audio can't decode, detector timeout, etc.)
 * so the caller can fall back to an even chunk grid instead of failing the
 * whole generation over one bad track.
 */
export function detectBeatGrid(filePath: string): Promise<BeatGrid | null> {
  const cached = cache.get(filePath)
  if (cached) return cached

  const promise = (async (): Promise<BeatGrid | null> => {
    try {
      const response = await fetch(toMediaUrl(filePath))
      if (!response.ok) return null
      const arrayBuffer = await response.arrayBuffer()
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextCtor()
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const { bpm, offset } = await guess(audioBuffer)
        return { bpm, offsetSeconds: offset }
      } finally {
        await audioContext.close()
      }
    } catch {
      return null
    }
  })()

  cache.set(filePath, promise)
  return promise
}
