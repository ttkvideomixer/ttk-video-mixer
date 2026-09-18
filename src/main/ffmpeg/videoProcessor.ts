import { spawn } from 'node:child_process'
import { rm, rename, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { RenderJobInput } from '@shared/types'
import { getFfmpegPath } from './binaries'
import { probeVideoFile } from './probe'
import { buildFilterGraph, computeEffectiveDuration, type RenderExtras, type SegmentInfo } from './filterGraph'
import { getSilenceTrimCached } from '../store/silenceCache'
import { computeFileSha256 } from '../utils/fileHash'
import { computeVisualFingerprint } from './fingerprint'

export interface ProcessJobInput extends RenderJobInput {
  outputPath: string
  videoMixerId: string
  projectName?: string
}

export interface ProcessJobResult {
  sha256: string
  visualFingerprint: string
}

export interface ProcessJobHandle {
  promise: Promise<ProcessJobResult>
  cancel: () => void
}

interface BaseSegmentInfo {
  durationSeconds: number
  hasAudio: boolean
  width: number | null
  height: number | null
}

const probeCache = new Map<string, Promise<BaseSegmentInfo>>()

function getBaseSegmentInfo(path: string): Promise<BaseSegmentInfo> {
  let cached = probeCache.get(path)
  if (!cached) {
    cached = probeVideoFile(path).then((result) => ({
      durationSeconds: result.durationSeconds ?? 3,
      hasAudio: result.hasAudio,
      width: result.width,
      height: result.height
    }))
    probeCache.set(path, cached)
  }
  return cached
}

export function clearProbeCache(): void {
  probeCache.clear()
}

async function buildSegmentInfo(path: string, silenceTrimEnabled: boolean): Promise<SegmentInfo> {
  const base = await getBaseSegmentInfo(path)
  const trim = silenceTrimEnabled ? await getSilenceTrimCached(path) : { trimStartMs: 0, trimEndMs: 0 }
  return {
    path,
    durationSeconds: base.durationSeconds,
    hasAudio: base.hasAudio,
    width: base.width,
    height: base.height,
    trimStartSeconds: trim.trimStartMs / 1000,
    trimEndSeconds: trim.trimEndMs / 1000
  }
}

/**
 * Runs a single ffmpeg job that concatenates hook + body + cta into one
 * final video (applying silence trim, creative variation and text overlays
 * when requested). Writes to a temporary file first and only moves it to
 * the final destination on success, so a crash/kill never leaves a
 * half-written file at the expected output path (which matters for resume
 * detection). After a successful render, validates the output with
 * ffprobe and computes its SHA-256 + visual fingerprint for duplicate
 * detection.
 */
export function processJob(input: ProcessJobInput, onProgress?: (ratio: number) => void): ProcessJobHandle {
  const tempOutputPath = `${input.outputPath}.tmp.mp4`
  let killedByCaller = false
  let child: ReturnType<typeof spawn> | null = null

  const promise = (async (): Promise<ProcessJobResult> => {
    const [hookBase, bodyBase, ctaBase] = await Promise.all([
      buildSegmentInfo(input.hookPath, input.silenceTrimEnabled),
      buildSegmentInfo(input.bodyPath, input.silenceTrimEnabled),
      buildSegmentInfo(input.ctaPath, input.silenceTrimEnabled)
    ])

    await mkdir(dirname(input.outputPath), { recursive: true })

    const segments: [SegmentInfo, SegmentInfo, SegmentInfo] = [hookBase, bodyBase, ctaBase]

    const extras: RenderExtras = {
      variation: input.variation,
      hookTextImagePath: input.hookTextImagePath,
      visualCtaImagePath: input.visualCtaImagePath,
      frameOverlayPath: input.framePath,
      audio: {
        muteHook: input.muteHook,
        muteBody: input.muteBody,
        muteCta: input.muteCta,
        hookTrackPath: input.hookAudioPath,
        bodyTrackPath: input.bodyAudioPath,
        ctaTrackPath: input.ctaAudioPath,
        fullTrackPath: input.fullAudioPath
      },
      beatCut: {
        hookEnabled: input.beatCutHook,
        bodyEnabled: input.beatCutBody,
        ctaEnabled: input.beatCutCta,
        fallbackChunkCount: input.beatCutFallbackChunkCount,
        allowedTransitionStyles: input.beatCutAllowedTransitions,
        seed: input.beatCutSeed,
        hookBeatGrid: input.hookBeatGrid,
        bodyBeatGrid: input.bodyBeatGrid,
        ctaBeatGrid: input.ctaBeatGrid,
        fullBeatGrid: input.fullBeatGrid
      },
      textMode: input.textMode
    }

    const mainInputCount = 3
    const graph = buildFilterGraph(segments, input.settings, mainInputCount, extras)
    const totalDuration = segments.reduce((sum, s) => sum + computeEffectiveDuration(s, input.variation), 0)

    const args: string[] = [
      '-y',
      '-i', input.hookPath,
      '-i', input.bodyPath,
      '-i', input.ctaPath,
      ...graph.extraInputArgs,
      '-filter_complex', graph.filterComplex,
      '-map', `[${graph.videoOutputLabel}]`,
      '-map', `[${graph.audioOutputLabel}]`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', String(input.settings.crf),
      // libx264's default keyframe interval is ~8-10s (no -g given). A
      // player can only seek precisely TO a keyframe — anything between
      // two gets rounded to the nearest one — so with sparse keyframes,
      // dragging the Preview scrubber to an arbitrary point visibly lands
      // several seconds away from where it was released. -g 30 caps the
      // interval at ~1s so every point on the timeline lands within ~1s of
      // where it's dropped.
      //
      // Deliberately NOT -sc_threshold 0 / -keyint_min 30 (an earlier
      // version of this fix had both, "to keep keyframes evenly spaced"):
      // that combination blocks libx264 from placing a keyframe at a real
      // scene cut whenever one falls within 30 frames of the last forced
      // one — which a hook/body/cta segment join almost always does, since
      // segment durations are essentially never exact multiples of -g.
      // Confirmed with ffprobe on a real concat: with that combination, the
      // frame at the join encodes as a giant P-frame predicted against the
      // PREVIOUS (completely different) segment instead of a clean I-frame
      // — visibly corrupting/freezing up to a full GOP (~1s) right at every
      // Gancho→Corpo / Corpo→CTA cut. Leaving sc_threshold/keyint_min at
      // libx264's defaults lets it insert a proper keyframe at the cut
      // (verified: the same test then shows a clean I-frame there) while
      // -g 30 still caps the interval everywhere else.
      '-g', '30',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', `${input.settings.audioBitrateKbps}k`,
      '-ar', '48000',
      '-ac', '2',
      // The MP4/MOV muxer only persists a fixed set of well-known metadata
      // keys and silently drops anything else (verified: a custom
      // "VideoMixerID=..." key is dropped, but "title"/"comment" survive) —
      // so the tracking id rides inside those two instead of its own key.
      '-metadata', `title=${input.videoMixerId}`,
      '-metadata',
      `comment=VideoMixerID=${input.videoMixerId}${input.projectName ? `; Projeto=${input.projectName}` : ''} - Gerado pelo TTK Video Mixer`,
      '-movflags', '+faststart',
      '-progress', 'pipe:1',
      '-nostats',
      tempOutputPath
    ]

    await new Promise<void>((resolve, reject) => {
      child = spawn(getFfmpegPath(), args, { windowsHide: true })

      let stderrTail = ''
      child.stderr?.on('data', (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-4000)
      })

      child.stdout?.on('data', (chunk: Buffer) => {
        if (!onProgress || totalDuration <= 0) return
        const text = chunk.toString()
        const match = text.match(/out_time_ms=(\d+)/)
        if (match) {
          const outTimeSeconds = Number(match[1]) / 1_000_000
          onProgress(Math.min(0.98, outTimeSeconds / totalDuration))
        }
      })

      child.on('error', (err) => reject(err))

      child.on('close', (code) => {
        if (killedByCaller) {
          reject(new Error('CANCELED'))
          return
        }
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`ffmpeg encerrou com codigo ${code}: ${stderrTail.trim().slice(-500)}`))
        }
      })
    })

    await rename(tempOutputPath, input.outputPath)

    const validation = await probeVideoFile(input.outputPath)
    if (!validation.hasVideo || !validation.durationSeconds) {
      throw new Error('Arquivo gerado invalido: nao foi possivel validar o stream de video.')
    }

    const [sha256, visualFingerprint] = await Promise.all([
      computeFileSha256(input.outputPath),
      computeVisualFingerprint(input.outputPath, validation.durationSeconds)
    ])

    onProgress?.(1)
    return { sha256, visualFingerprint }
  })().catch(async (error) => {
    await rm(tempOutputPath, { force: true }).catch(() => undefined)
    throw error
  })

  return {
    promise,
    cancel: () => {
      killedByCaller = true
      child?.kill('SIGKILL')
    }
  }
}
