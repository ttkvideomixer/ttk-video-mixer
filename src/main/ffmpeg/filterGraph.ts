import type { ExportSettings, OverlayTransform, VariationParameters } from '@shared/types'
import { RESOLUTION_MAP } from '@shared/resolutions'
import { NEUTRAL_VARIATION_PARAMETERS } from '@shared/defaults'
import { fitTextToWidth, LINE_HEIGHT_MULTIPLIER } from '@shared/textWrap'
import { escapeFfmpegFilterPath } from './ffmpegEscape'

export interface SegmentInfo {
  path: string
  durationSeconds: number
  hasAudio: boolean
  width: number | null
  height: number | null
  /** Seconds to trim from the start/end (silence removal). 0 when disabled or none detected. */
  trimStartSeconds: number
  trimEndSeconds: number
}

export interface ResolvedTextOverlay {
  content: string
  overlay: OverlayTransform
  /** Wrapped lines, in order — one drawtext filter is emitted per line (see buildDrawTextStage). */
  lines: string[]
  /** Absolute path to a temp UTF-8 textfile for each line, same order as `lines`. */
  lineTextFilePaths: string[]
  /** From {@link resolveTextFit}: how much to shrink the base font size so the wrapped text fits. */
  fontSizeRatio: number
}

/**
 * Muting is a simple per-category on/off over the segment's OWN audio.
 * Attached tracks are independent and additive (mixed in via `amix`, not a
 * replacement) — muting a category and attaching a track to it is exactly
 * "replace the original with my track", since there's nothing left to mix
 * with; attaching without muting layers the track on top of the original.
 */
export interface AudioExtras {
  muteHook: boolean
  muteBody: boolean
  muteCta: boolean
  /** Looped/trimmed to exactly that segment's effective duration — one track per segment, independent pools. */
  hookTrackPath: string | null
  bodyTrackPath: string | null
  ctaTrackPath: string | null
  /** Looped/trimmed to the WHOLE finished video's duration (hook start to CTA end), mixed in after concat. */
  fullTrackPath: string | null
}

export interface RenderExtras {
  variation: VariationParameters
  hookText: ResolvedTextOverlay | null
  visualCta: ResolvedTextOverlay | null
  fontFilePath: string
  /** Moldura: absolute path to a transparent-center PNG overlaid on top of the WHOLE finished video (all 3 segments), full duration. */
  frameOverlayPath: string | null
  audio: AudioExtras
}

export interface FilterGraphResult {
  extraInputArgs: string[]
  filterComplex: string
  videoOutputLabel: string
  audioOutputLabel: string
}

const FALLBACK_DURATION_SECONDS = 3
const NO_EXTRAS: RenderExtras = {
  variation: NEUTRAL_VARIATION_PARAMETERS,
  hookText: null,
  visualCta: null,
  fontFilePath: '',
  frameOverlayPath: null,
  audio: {
    muteHook: false,
    muteBody: false,
    muteCta: false,
    hookTrackPath: null,
    bodyTrackPath: null,
    ctaTrackPath: null,
    fullTrackPath: null
  }
}

export function resolveTargetSize(settings: ExportSettings, segments: SegmentInfo[]): { width: number; height: number } {
  if (settings.resolution !== 'original') {
    return RESOLUTION_MAP[settings.resolution]
  }

  const reference = segments[0]
  const width = reference.width && reference.width % 2 === 0 ? reference.width : reference.width ? reference.width + 1 : 1080
  const height = reference.height && reference.height % 2 === 0 ? reference.height : reference.height ? reference.height + 1 : 1920
  return { width, height }
}

function buildScaleFilter(framing: ExportSettings['framing'], width: number, height: number): string {
  if (framing === 'cover') {
    return `scale=w=${width}:h=${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`
  }
  return `scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`
}

export function safeDuration(segment: SegmentInfo): number {
  return segment.durationSeconds > 0 ? segment.durationSeconds : FALLBACK_DURATION_SECONDS
}

/** Segment duration once silence-trim and speed variation are applied — used for sync and text timing. */
export function computeEffectiveDuration(segment: SegmentInfo, variation: VariationParameters): number {
  const trimmed = Math.max(0.2, safeDuration(segment) - segment.trimStartSeconds - segment.trimEndSeconds)
  return trimmed / variation.speed
}

function buildRotationStage(width: number, height: number, rotationDegrees: number): string[] {
  if (rotationDegrees === 0) return []
  const rad = (rotationDegrees * Math.PI) / 180
  const margin = 1.06
  return [
    `scale=${Math.round(width * margin)}:${Math.round(height * margin)}`,
    `rotate=${rad.toFixed(6)}:fillcolor=black:ow=rotw(${rad.toFixed(6)}):oh=roth(${rad.toFixed(6)})`,
    `crop=${width}:${height}`
  ]
}

function buildZoomCropStage(width: number, height: number, zoom: number, cropX: number, cropY: number): string[] {
  if (zoom === 1) return []
  const scaledW = Math.round(width * zoom)
  const scaledH = Math.round(height * zoom)
  const marginX = (scaledW - width) / 2
  const marginY = (scaledH - height) / 2
  const x = Math.max(0, Math.min(scaledW - width, Math.round(marginX + marginX * cropX)))
  const y = Math.max(0, Math.min(scaledH - height, Math.round(marginY + marginY * cropY)))
  return [`scale=${scaledW}:${scaledH}`, `crop=${width}:${height}:${x}:${y}`]
}

function buildColorStage(variation: VariationParameters): string[] {
  if (variation.brightness === 0 && variation.contrast === 1 && variation.saturation === 1) return []
  return [`eq=brightness=${variation.brightness}:contrast=${variation.contrast}:saturation=${variation.saturation}`]
}

/**
 * Emits one drawtext filter per line instead of a single multi-line one.
 * Two reasons:
 *  1. ffmpeg's drawtext left-aligns every line to the same x when given
 *     multi-line text (text_w reflects only the widest line), so a shorter
 *     line does NOT get individually centered under a longer one — it
 *     looks visibly off-center. Per-line filters each read their own
 *     line's real `text_w` from ffmpeg, giving pixel-accurate centering.
 *  2. It lets `y` be computed as an explicit center-anchored number (see
 *     below) instead of relying on multi-line `text_h`, which keeps this
 *     in lockstep with the Preview overlay editor's own CSS centering
 *     (translate(-50%,-50%) — xNormalized/yNormalized is the BLOCK
 *     CENTER, not its top-left corner).
 */
function buildDrawTextStage(
  overlay: ResolvedTextOverlay,
  fontFilePath: string,
  targetHeight: number,
  enableExpr: string | null
): string {
  const fontSize = Math.max(12, Math.round(targetHeight * 0.09 * overlay.fontSizeRatio * overlay.overlay.scale))
  const borderWidth = Math.max(2, Math.round(fontSize * 0.08))
  const fontfile = escapeFfmpegFilterPath(fontFilePath)
  const lineHeight = fontSize * LINE_HEIGHT_MULTIPLIER
  const totalBlockHeight = lineHeight * overlay.lines.length
  const topY = overlay.overlay.yNormalized * targetHeight - totalBlockHeight / 2 + (lineHeight - fontSize) / 2

  return overlay.lines
    .map((_line, i) => {
      const textfile = escapeFfmpegFilterPath(overlay.lineTextFilePaths[i])
      const y = Math.round(topY + i * lineHeight)
      const parts = [
        `drawtext=fontfile=${fontfile}`,
        `textfile=${textfile}`,
        `fontsize=${fontSize}`,
        'fontcolor=white',
        'bordercolor=black',
        `borderw=${borderWidth}`,
        `x=(W*${overlay.overlay.xNormalized})-(text_w/2)`,
        `y=${y}`
      ]
      if (enableExpr) parts.push(`enable='${enableExpr}'`)
      return parts.join(':')
    })
    .join(',')
}

/**
 * Builds the full filter_complex graph that normalizes the 3 segments
 * (hook, body, cta) to a shared resolution/format and joins them using the
 * requested transition. Always emits a stereo AAC-ready audio stream, even
 * when one or more segments have no audio track, by synthesizing silence.
 *
 * When `extras` is omitted, the output is byte-for-byte the same as the
 * original (pre-creative-variation) pipeline.
 */
export function buildFilterGraph(
  segments: [SegmentInfo, SegmentInfo, SegmentInfo],
  settings: ExportSettings,
  mainInputCount: number,
  extras: RenderExtras = NO_EXTRAS
): FilterGraphResult {
  const { width, height } = resolveTargetSize(settings, segments)
  const scaleFilter = buildScaleFilter(settings.framing, width, height)
  const fpsFilter = settings.fps === 'original' ? '' : `,fps=${settings.fps}`
  const variation = extras.variation

  const extraInputArgs: string[] = []
  const videoLabels: string[] = []
  const audioLabels: string[] = []
  const filterLines: string[] = []
  let nextInputIndex = mainInputCount

  segments.forEach((segment, i) => {
    const vLabel = `v${i}`
    const preStages: string[] = []
    const hasTrim = segment.trimStartSeconds > 0 || segment.trimEndSeconds > 0
    const trimEnd = Math.max(segment.trimStartSeconds + 0.05, safeDuration(segment) - segment.trimEndSeconds)

    if (hasTrim) {
      preStages.push(`trim=start=${segment.trimStartSeconds.toFixed(3)}:end=${trimEnd.toFixed(3)}`, 'setpts=PTS-STARTPTS')
    }
    if (variation.speed !== 1) {
      preStages.push(`setpts=${(1 / variation.speed).toFixed(6)}*PTS`)
    }
    if (variation.mirror) {
      preStages.push('hflip')
    }

    const postStages: string[] = [...buildRotationStage(width, height, variation.rotation), ...buildZoomCropStage(width, height, variation.zoom, variation.cropX, variation.cropY), ...buildColorStage(variation)]

    const isHookSegment = i === 0
    const isCtaSegment = i === 2
    const textOverlay = isHookSegment ? extras.hookText : isCtaSegment ? extras.visualCta : null

    if (textOverlay) {
      const effectiveDuration = computeEffectiveDuration(segment, variation)
      const enableExpr = isHookSegment ? buildHookTextTimingExpr(effectiveDuration) : null
      postStages.push(buildDrawTextStage(textOverlay, extras.fontFilePath, height, enableExpr))
    }

    const chain = [...preStages, scaleFilter, 'setsar=1', 'format=yuv420p', ...postStages].join(',')
    filterLines.push(`[${i}:v]${chain}${fpsFilter}[${vLabel}]`)
    videoLabels.push(vLabel)

    // Which per-category mute flag / attached track applies to this segment
    // (0=hook, 1=body, 2=cta) — same index the video side already uses for
    // isHookSegment/isCtaSegment above.
    const muted = i === 0 ? extras.audio.muteHook : i === 1 ? extras.audio.muteBody : extras.audio.muteCta
    const trackPath = i === 0 ? extras.audio.hookTrackPath : i === 1 ? extras.audio.bodyTrackPath : extras.audio.ctaTrackPath
    const segmentDuration = computeEffectiveDuration(segment, variation)

    const aLabel = `a${i}`
    // Collects every audio source that should be audible during this
    // segment — the original clip's own audio (unless muted or absent) and
    // an attached track (if one was assigned to this category for this
    // job) — then mixes whichever ones are present. Attaching is additive,
    // not a replacement: with both present they play together via amix.
    const mixLabels: string[] = []

    if (segment.hasAudio && !muted) {
      const origLabel = `aOrig${i}`
      const audioPre = hasTrim ? `atrim=start=${segment.trimStartSeconds.toFixed(3)}:end=${trimEnd.toFixed(3)},asetpts=PTS-STARTPTS,` : ''
      const audioSpeed = variation.speed !== 1 ? `atempo=${variation.speed.toFixed(3)},` : ''
      filterLines.push(
        `[${i}:a]${audioPre}${audioSpeed}aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[${origLabel}]`
      )
      mixLabels.push(origLabel)
    }

    if (trackPath) {
      const trackInputIndex = nextInputIndex
      nextInputIndex++
      // -stream_loop -1 repeats the file indefinitely; the atrim below then
      // either cuts it short (track longer than the segment) or is simply
      // never reached (track shorter, so the loop keeps it filled) — one
      // mechanism handles both "loop if short" and "cut if long".
      extraInputArgs.push('-stream_loop', '-1', '-i', trackPath)
      const trackLabel = `aTrack${i}`
      filterLines.push(
        `[${trackInputIndex}:a]atrim=0:${segmentDuration.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[${trackLabel}]`
      )
      mixLabels.push(trackLabel)
    }

    if (mixLabels.length === 2) {
      filterLines.push(`[${mixLabels[0]}][${mixLabels[1]}]amix=inputs=2:duration=first:dropout_transition=0[${aLabel}]`)
    } else if (mixLabels.length === 1) {
      filterLines.push(`[${mixLabels[0]}]anull[${aLabel}]`)
    } else {
      const silentInputIndex = nextInputIndex
      nextInputIndex++
      extraInputArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000')
      filterLines.push(`[${silentInputIndex}:a]atrim=0:${segmentDuration.toFixed(3)},asetpts=PTS-STARTPTS[${aLabel}]`)
    }
    audioLabels.push(aLabel)
  })

  let result: FilterGraphResult
  if (settings.transition === 'crossfade') {
    result = buildCrossfadeGraph(segments, videoLabels, audioLabels, filterLines, settings, extraInputArgs, variation)
  } else if (settings.transition === 'fade') {
    result = buildFadeGraph(segments, videoLabels, audioLabels, filterLines, settings, extraInputArgs, variation)
  } else {
    filterLines.push(
      `[${videoLabels[0]}][${audioLabels[0]}][${videoLabels[1]}][${audioLabels[1]}][${videoLabels[2]}][${audioLabels[2]}]concat=n=3:v=1:a=1[outv][outa]`
    )
    result = {
      extraInputArgs,
      filterComplex: filterLines.join(';'),
      videoOutputLabel: 'outv',
      audioOutputLabel: 'outa'
    }
  }

  // Upper bound on total output duration (exact for cut/concat; a safe
  // overestimate for fade/crossfade, which trim a little at the joins) —
  // used to give looped still-image/audio inputs a finite length, never to
  // trim the actual output.
  const maxDuration = segments.reduce((sum, s) => sum + computeEffectiveDuration(s, variation), 0)

  if (extras.frameOverlayPath) {
    result = applyFrameOverlay(result, extras.frameOverlayPath, width, height, nextInputIndex, maxDuration)
    nextInputIndex++
  }

  if (extras.audio.fullTrackPath) {
    result = applyFullAudioOverlay(result, extras.audio.fullTrackPath, nextInputIndex, maxDuration)
    nextInputIndex++
  }

  return result
}

/**
 * Overlays a transparent-center PNG on top of the fully concatenated video
 * for its entire duration. The image is its own ffmpeg input with `-loop 1`
 * (an infinite still-image "video" source) — WITHOUT an explicit `-t`, that
 * input never reaches EOF on its own, and ffmpeg hangs encoding forever
 * instead of stopping when the (finite) main video ends. Bounding it to
 * `maxDuration` (>= the real output length) fixes that while never being
 * the one to cut the output short — the main input still governs.
 */
function applyFrameOverlay(
  result: FilterGraphResult,
  framePath: string,
  width: number,
  height: number,
  frameInputIndex: number,
  maxDuration: number
): FilterGraphResult {
  const scaledLabel = 'frameov'
  const outLabel = 'outv_framed'
  const frameChain = `[${frameInputIndex}:v]format=rgba,scale=${width}:${height}[${scaledLabel}]`
  const overlayLine = `[${result.videoOutputLabel}][${scaledLabel}]overlay=0:0[${outLabel}]`

  return {
    extraInputArgs: [...result.extraInputArgs, '-loop', '1', '-t', maxDuration.toFixed(3), '-i', framePath],
    filterComplex: `${result.filterComplex};${frameChain};${overlayLine}`,
    videoOutputLabel: outLabel,
    audioOutputLabel: result.audioOutputLabel
  }
}

/**
 * Mixes a user-picked track across the WHOLE finished video (hook start to
 * CTA end) into the final audio, independent of and additive with whatever
 * is already playing per-segment (original audio and/or per-segment
 * attached tracks). Same -stream_loop -1 + atrim mechanism as the
 * per-segment tracks — repeats if the track is short, gets cut at the end
 * if it's long — just bounded by the whole output's duration instead of a
 * single segment's.
 */
function applyFullAudioOverlay(
  result: FilterGraphResult,
  trackPath: string,
  trackInputIndex: number,
  maxDuration: number
): FilterGraphResult {
  const trackLabel = 'aFull'
  const outLabel = 'outa_full'
  const trackChain = `[${trackInputIndex}:a]atrim=0:${maxDuration.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[${trackLabel}]`
  const mixLine = `[${result.audioOutputLabel}][${trackLabel}]amix=inputs=2:duration=first:dropout_transition=0[${outLabel}]`

  return {
    extraInputArgs: [...result.extraInputArgs, '-stream_loop', '-1', '-i', trackPath],
    filterComplex: `${result.filterComplex};${trackChain};${mixLine}`,
    videoOutputLabel: result.videoOutputLabel,
    audioOutputLabel: outLabel
  }
}

/** Hook text becomes visible ~0.10-0.15s after start and hides ~0.15-0.20s before the segment ends. */
function buildHookTextTimingExpr(effectiveDuration: number): string {
  const inTime = Math.min(0.12, effectiveDuration * 0.15)
  const outTime = Math.max(inTime + 0.05, effectiveDuration - Math.min(0.18, effectiveDuration * 0.15))
  return `between(t,${inTime.toFixed(3)},${outTime.toFixed(3)})`
}

/** Pre-computes the wrapped lines + font ratio for a text overlay given the current target resolution. */
export function resolveTextFit(content: string, overlay: OverlayTransform, targetWidth: number, targetHeight: number) {
  const baseFontSizePx = targetHeight * 0.09 * overlay.scale
  const maxWidthPx = targetWidth * overlay.maxWidthNormalized
  return fitTextToWidth(content, baseFontSizePx, maxWidthPx)
}

function buildFadeGraph(
  segments: [SegmentInfo, SegmentInfo, SegmentInfo],
  videoLabels: string[],
  audioLabels: string[],
  filterLines: string[],
  settings: ExportSettings,
  extraInputArgs: string[],
  variation: VariationParameters
): FilterGraphResult {
  const T = settings.transitionDuration
  const durations = segments.map((s) => computeEffectiveDuration(s, variation))

  const fadedVideoLabels = videoLabels.map((label, i) => {
    const d = durations[i]
    const clampedT = Math.min(T, Math.max(0.05, d / 2 - 0.02))
    const outLabel = `${label}f`
    const parts: string[] = []
    if (i > 0) parts.push(`fade=t=in:d=${clampedT}`)
    if (i < videoLabels.length - 1) parts.push(`fade=t=out:st=${Math.max(0, d - clampedT)}:d=${clampedT}`)
    if (parts.length === 0) {
      filterLines.push(`[${label}]null[${outLabel}]`)
    } else {
      filterLines.push(`[${label}]${parts.join(',')}[${outLabel}]`)
    }
    return outLabel
  })

  const fadedAudioLabels = audioLabels.map((label, i) => {
    const d = durations[i]
    const clampedT = Math.min(T, Math.max(0.05, d / 2 - 0.02))
    const outLabel = `${label}f`
    const parts: string[] = []
    if (i > 0) parts.push(`afade=t=in:d=${clampedT}`)
    if (i < audioLabels.length - 1) parts.push(`afade=t=out:st=${Math.max(0, d - clampedT)}:d=${clampedT}`)
    if (parts.length === 0) {
      filterLines.push(`[${label}]anull[${outLabel}]`)
    } else {
      filterLines.push(`[${label}]${parts.join(',')}[${outLabel}]`)
    }
    return outLabel
  })

  filterLines.push(
    `[${fadedVideoLabels[0]}][${fadedAudioLabels[0]}][${fadedVideoLabels[1]}][${fadedAudioLabels[1]}][${fadedVideoLabels[2]}][${fadedAudioLabels[2]}]concat=n=3:v=1:a=1[outv][outa]`
  )

  return {
    extraInputArgs,
    filterComplex: filterLines.join(';'),
    videoOutputLabel: 'outv',
    audioOutputLabel: 'outa'
  }
}

function buildCrossfadeGraph(
  segments: [SegmentInfo, SegmentInfo, SegmentInfo],
  videoLabels: string[],
  audioLabels: string[],
  filterLines: string[],
  settings: ExportSettings,
  extraInputArgs: string[],
  variation: VariationParameters
): FilterGraphResult {
  const durations = segments.map((s) => computeEffectiveDuration(s, variation))
  const t1 = Math.min(settings.transitionDuration, Math.max(0.05, Math.min(durations[0], durations[1]) - 0.1))

  filterLines.push(
    `[${videoLabels[0]}][${videoLabels[1]}]xfade=transition=fade:duration=${t1}:offset=${Math.max(0, durations[0] - t1)}[vx01]`
  )
  filterLines.push(`[${audioLabels[0]}][${audioLabels[1]}]acrossfade=d=${t1}[ax01]`)

  const mergedDuration01 = durations[0] + durations[1] - t1
  const t2 = Math.min(settings.transitionDuration, Math.max(0.05, Math.min(mergedDuration01, durations[2]) - 0.1))

  filterLines.push(
    `[vx01][${videoLabels[2]}]xfade=transition=fade:duration=${t2}:offset=${Math.max(0, mergedDuration01 - t2)}[outv]`
  )
  filterLines.push(`[ax01][${audioLabels[2]}]acrossfade=d=${t2}[outa]`)

  return {
    extraInputArgs,
    filterComplex: filterLines.join(';'),
    videoOutputLabel: 'outv',
    audioOutputLabel: 'outa'
  }
}
