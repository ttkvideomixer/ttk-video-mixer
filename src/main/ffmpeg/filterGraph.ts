import type { BeatFxStyle, BeatGrid, BeatTransitionStyle, ExportSettings, TextMode, VariationParameters } from '@shared/types'
import { RESOLUTION_MAP } from '@shared/resolutions'
import { NEUTRAL_VARIATION_PARAMETERS } from '@shared/defaults'
import { buildChunkPlan, prefixSums, resolveBeatBoundaries, type ChunkPlan } from '@shared/beatCut'
import { mulberry32 } from '@shared/rng'

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

/**
 * Splits a segment's OWN footage into chunks (beat-aligned when a track is
 * attached, evenly spaced otherwise), shuffles their playback order, and
 * joins them with a randomly-picked `xfade`/`acrossfade` transition per cut
 * — a different remix per generated video. Independent per category, off by
 * default. `seed` is per-job (see GenerationJob.beatCutSeed) so every job
 * gets its own unique shuffle/transition picks.
 */
export interface BeatCutExtras {
  hookEnabled: boolean
  bodyEnabled: boolean
  ctaEnabled: boolean
  fallbackChunkCount: number
  allowedTransitionStyles: BeatTransitionStyle[]
  seed: number
  /** Resolved from whichever track this job's category got assigned — null when that category has no track. */
  hookBeatGrid: BeatGrid | null
  bodyBeatGrid: BeatGrid | null
  ctaBeatGrid: BeatGrid | null
  /** Falls back to this (whole-video) grid for a category with no track of its own but a full-span one attached — the most common intended use. */
  fullBeatGrid: BeatGrid | null
}

/**
 * "Efeitos na Batida" (Beat FX) — punch-style visual hits (zoom, shake,
 * flash, RGB glitch, invert blip, hue swing) applied exactly at each beat
 * instant, WITHOUT reordering footage (unlike Beat Cut). Independent per
 * category; composes with Beat Cut on the same category by running first —
 * Beat Cut's split/reorder/xfade then operates on the already-punched
 * pixels, which is safe because Beat FX never changes any chunk's duration.
 */
export interface BeatFxExtras {
  hookEnabled: boolean
  bodyEnabled: boolean
  ctaEnabled: boolean
  fallbackChunkCount: number
  allowedStyles: BeatFxStyle[]
  seed: number
  hookBeatGrid: BeatGrid | null
  bodyBeatGrid: BeatGrid | null
  ctaBeatGrid: BeatGrid | null
  fullBeatGrid: BeatGrid | null
}

export interface RenderExtras {
  variation: VariationParameters
  /** Pre-rendered (Chromium canvas, not ffmpeg drawtext — see renderer/utils/renderTextOverlay.ts) transparent PNG at the target resolution, already positioned. Null when there's no text for this job/segment. */
  hookTextImagePath: string | null
  visualCtaImagePath: string | null
  /** Moldura: absolute path to a transparent-center PNG overlaid on top of the WHOLE finished video (all 3 segments), full duration. */
  frameOverlayPath: string | null
  audio: AudioExtras
  beatCut: BeatCutExtras
  beatFx: BeatFxExtras
  /** 'fullSpan': hookTextImagePath is burned in as ONE continuous overlay covering the whole output instead of just the hook segment, and visualCtaImagePath is ignored entirely. */
  textMode: TextMode
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
  hookTextImagePath: null,
  visualCtaImagePath: null,
  frameOverlayPath: null,
  audio: {
    muteHook: false,
    muteBody: false,
    muteCta: false,
    hookTrackPath: null,
    bodyTrackPath: null,
    ctaTrackPath: null,
    fullTrackPath: null
  },
  beatCut: {
    hookEnabled: false,
    bodyEnabled: false,
    ctaEnabled: false,
    fallbackChunkCount: 4,
    allowedTransitionStyles: [],
    seed: 0,
    hookBeatGrid: null,
    bodyBeatGrid: null,
    ctaBeatGrid: null,
    fullBeatGrid: null
  },
  beatFx: {
    hookEnabled: false,
    bodyEnabled: false,
    ctaEnabled: false,
    fallbackChunkCount: 8,
    allowedStyles: [],
    seed: 0,
    hookBeatGrid: null,
    bodyBeatGrid: null,
    ctaBeatGrid: null,
    fullBeatGrid: null
  },
  textMode: 'perSegment'
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

  const segmentDurations = segments.map((s) => computeEffectiveDuration(s, variation))
  const offsetsBeforeSegment = prefixSums(segmentDurations)
  // Beat Cut's internal xfade joins shrink a segment below its nominal
  // duration (each join overlaps two chunks instead of playing them back to
  // back) — starts as a copy of the nominal durations and gets overwritten
  // below with the real post-remix length wherever a plan is applied, so the
  // outer hook/body/cta join always offsets against what's actually there.
  const actualSegmentDurations = [...segmentDurations]

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
    const fullSpanText = extras.textMode === 'fullSpan'
    const textImagePath = !fullSpanText && isHookSegment ? extras.hookTextImagePath : !fullSpanText && isCtaSegment ? extras.visualCtaImagePath : null

    const segmentDuration = segmentDurations[i]

    // Beat Cut plan for this segment (null = feature off, or fewer than 2
    // chunks resolved — either way, nothing to shuffle, fall through to the
    // exact original single-chain path below so the output stays
    // byte-for-byte identical to before this feature existed).
    const categoryEnabled = i === 0 ? extras.beatCut.hookEnabled : i === 1 ? extras.beatCut.bodyEnabled : extras.beatCut.ctaEnabled
    let plan: ChunkPlan | null = null
    if (categoryEnabled) {
      const categoryGrid = i === 0 ? extras.beatCut.hookBeatGrid : i === 1 ? extras.beatCut.bodyBeatGrid : extras.beatCut.ctaBeatGrid
      const usingFullGrid = !categoryGrid && !!extras.beatCut.fullBeatGrid
      const grid = categoryGrid ?? extras.beatCut.fullBeatGrid
      const cumulativeOffset = usingFullGrid ? offsetsBeforeSegment[i] : 0
      const boundaries = resolveBeatBoundaries(grid, extras.beatCut.fallbackChunkCount, segmentDuration, cumulativeOffset)
      plan = buildChunkPlan(boundaries, extras.beatCut.seed + i * 13, extras.beatCut.allowedTransitionStyles)
    }

    // Beat FX plan — independent of Beat Cut, its own chunk density/grid.
    // Resolved as a boundary list only (no shuffle): it decorates each chunk
    // with a punch effect in place, so it composes safely with Beat Cut by
    // running first — Beat Cut's split/reorder/xfade then works on the
    // already-punched pixels without caring that they were touched.
    const fxCategoryEnabled = i === 0 ? extras.beatFx.hookEnabled : i === 1 ? extras.beatFx.bodyEnabled : extras.beatFx.ctaEnabled
    let fxBoundaries: number[] | null = null
    if (fxCategoryEnabled && extras.beatFx.allowedStyles.length > 0) {
      const fxCategoryGrid = i === 0 ? extras.beatFx.hookBeatGrid : i === 1 ? extras.beatFx.bodyBeatGrid : extras.beatFx.ctaBeatGrid
      const fxUsingFullGrid = !fxCategoryGrid && !!extras.beatFx.fullBeatGrid
      const fxGrid = fxCategoryGrid ?? extras.beatFx.fullBeatGrid
      const fxCumulativeOffset = fxUsingFullGrid ? offsetsBeforeSegment[i] : 0
      const resolved = resolveBeatBoundaries(fxGrid, extras.beatFx.fallbackChunkCount, segmentDuration, fxCumulativeOffset)
      fxBoundaries = resolved.length > 2 ? resolved : null
    }

    if (!plan && !fxBoundaries && !textImagePath) {
      // Exact original single-chain path — byte-for-byte identical output
      // when neither feature touches this segment.
      const chain = [...preStages, scaleFilter, 'setsar=1', 'format=yuv420p', ...postStages].join(',')
      filterLines.push(`[${i}:v]${chain}${fpsFilter}[${vLabel}]`)
    } else {
      let curLabel = `${i}:v`
      if (preStages.length > 0) {
        const preLabel = `pre${i}`
        filterLines.push(`[${i}:v]${preStages.join(',')}[${preLabel}]`)
        curLabel = preLabel
      }
      if (fxBoundaries) {
        const nativeWidth = segment.width && segment.width % 2 === 0 ? segment.width : segment.width ? segment.width + 1 : width
        const nativeHeight = segment.height && segment.height % 2 === 0 ? segment.height : segment.height ? segment.height + 1 : height
        const fx = applyBeatFx(curLabel, fxBoundaries, extras.beatFx.allowedStyles, extras.beatFx.seed + i * 17, i, nativeWidth, nativeHeight)
        filterLines.push(...fx.filterLines)
        curLabel = fx.videoLabel
      }
      if (plan) {
        const remix = applyBeatCutVideoRemix(curLabel, plan, i)
        filterLines.push(...remix.filterLines)
        curLabel = remix.videoLabel
        actualSegmentDurations[i] = remix.duration
      }
      if (textImagePath) {
        // Text overlay is applied AFTER scale/rotate/zoom/color (same spot
        // drawtext used to run in postStages) so it stays crisp and
        // unaffected by those effects, then a final fps stage closes the
        // chain — mirroring the single-line path's [...,fps] ordering.
        const scaledLabel = `scaled${i}`
        const chain = [scaleFilter, 'setsar=1', 'format=yuv420p', ...postStages].join(',')
        filterLines.push(`[${curLabel}]${chain}[${scaledLabel}]`)

        const imgInputIndex = nextInputIndex
        nextInputIndex++
        extraInputArgs.push('-loop', '1', '-t', segmentDuration.toFixed(3), '-i', textImagePath)
        const imgLabel = `textimg${i}`
        filterLines.push(`[${imgInputIndex}:v]format=rgba[${imgLabel}]`)
        const overlaidLabel = `textOverlaid${i}`
        filterLines.push(`[${scaledLabel}][${imgLabel}]overlay=0:0[${overlaidLabel}]`)

        if (fpsFilter) {
          filterLines.push(`[${overlaidLabel}]fps=${settings.fps}[${vLabel}]`)
        } else {
          filterLines.push(`[${overlaidLabel}]null[${vLabel}]`)
        }
      } else {
        const chain = [scaleFilter, 'setsar=1', 'format=yuv420p', ...postStages].join(',')
        filterLines.push(`[${curLabel}]${chain}${fpsFilter}[${vLabel}]`)
      }
    }
    videoLabels.push(vLabel)

    // Which per-category mute flag / attached track applies to this segment
    // (0=hook, 1=body, 2=cta) — same index the video side already uses for
    // isHookSegment/isCtaSegment above.
    const muted = i === 0 ? extras.audio.muteHook : i === 1 ? extras.audio.muteBody : extras.audio.muteCta
    const trackPath = i === 0 ? extras.audio.hookTrackPath : i === 1 ? extras.audio.bodyTrackPath : extras.audio.ctaTrackPath

    const aLabel = `a${i}`
    // Collects every audio source that should be audible during this
    // segment — the original clip's own audio (unless muted or absent) and
    // an attached track (if one was assigned to this category for this
    // job) — then mixes whichever ones are present. Attaching is additive,
    // not a replacement: with both present they play together via amix.
    const mixLabels: string[] = []

    if (segment.hasAudio && !muted) {
      let origLabel = `aOrig${i}`
      const audioPre = hasTrim ? `atrim=start=${segment.trimStartSeconds.toFixed(3)}:end=${trimEnd.toFixed(3)},asetpts=PTS-STARTPTS,` : ''
      const audioSpeed = variation.speed !== 1 ? `atempo=${variation.speed.toFixed(3)},` : ''
      filterLines.push(
        `[${i}:a]${audioPre}${audioSpeed}aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[${origLabel}]`
      )
      // Same plan as the video side (same boundaries/order/transitions) so the
      // shuffled audio always stays sample-accurate in sync with the video.
      if (plan) {
        const remixA = applyBeatCutAudioRemix(origLabel, plan, i)
        filterLines.push(...remixA.filterLines)
        origLabel = remixA.audioLabel
      }
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
      // Sized to actualSegmentDurations[i], not the nominal segmentDuration —
      // when Beat Cut shrinks this segment's video, the attached track must
      // match that shrunk length too, or this segment's audio would outlast
      // its own video going into the concat with the next category.
      filterLines.push(
        `[${trackInputIndex}:a]atrim=0:${actualSegmentDurations[i].toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[${trackLabel}]`
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
      filterLines.push(`[${silentInputIndex}:a]atrim=0:${actualSegmentDurations[i].toFixed(3)},asetpts=PTS-STARTPTS[${aLabel}]`)
    }
    audioLabels.push(aLabel)
  })

  let result: FilterGraphResult
  if (settings.transition === 'crossfade') {
    result = buildCrossfadeGraph(actualSegmentDurations, videoLabels, audioLabels, filterLines, settings, extraInputArgs, settings.crossfadeStyle)
  } else if (settings.transition === 'fade') {
    result = buildFadeGraph(actualSegmentDurations, videoLabels, audioLabels, filterLines, settings, extraInputArgs)
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

  if (extras.textMode === 'fullSpan' && extras.hookTextImagePath) {
    // Full-span text is just another full-frame transparent PNG overlaid for
    // the whole output — the exact same mechanism as the moldura frame
    // overlay above, just a different image.
    result = applyFrameOverlay(result, extras.hookTextImagePath, width, height, nextInputIndex, maxDuration)
    nextInputIndex++
  }

  return result
}

/**
 * Never let an xfade/acrossfade join eat more than ~30% of either
 * neighboring chunk — chunks can be as short as one beat interval. The 0.05s
 * floor here used to combine with short beat-driven chunks to produce
 * transitions under a single frame — visually indistinguishable from a hard
 * cut with no effect at all, which is what made a beat-cut segment look like
 * it "freezes" on the low-motion chunk right before an abrupt jump instead
 * of showing the chosen transition. 0.15s (~4-5 frames at 30fps) is short
 * enough to still feel snappy but long enough for a wipe/slide/zoom/etc. to
 * actually be visible — confirmed with a real render.
 */
function clampTransitionDuration(a: number, b: number): number {
  return Math.min(0.5, Math.max(0.15, Math.min(a, b) * 0.3))
}

/**
 * Slices `inLabel` (video) into `plan.boundaries`-defined chunks (in their
 * ORIGINAL source-time order) and re-joins them via `xfade` in `plan.order`
 * — the shuffled playback order — using `plan.transitions[j]` for the j-th
 * join. Total output duration matches the input's (same "shrinks slightly
 * per join" arithmetic as the main Gancho/Corpo/CTA crossfade joins).
 */
function applyBeatCutVideoRemix(inLabel: string, plan: ChunkPlan, segmentIndex: number): { videoLabel: string; duration: number; filterLines: string[] } {
  const { boundaries, order, transitions } = plan
  const chunkCount = boundaries.length - 1
  const filterLines: string[] = []

  // A filtergraph link can only feed ONE filter — trimming N chunks out of
  // the same source label requires explicitly fanning it out first.
  const splitLabels = Array.from({ length: chunkCount }, (_, k) => `bcvSrc${segmentIndex}_${k}`)
  filterLines.push(`[${inLabel}]split=${chunkCount}${splitLabels.map((l) => `[${l}]`).join('')}`)

  for (let k = 0; k < chunkCount; k++) {
    filterLines.push(
      `[${splitLabels[k]}]trim=start=${boundaries[k].toFixed(3)}:end=${boundaries[k + 1].toFixed(3)},setpts=PTS-STARTPTS[bcv${segmentIndex}_${k}]`
    )
  }

  const chunkDurations = order.map((k) => boundaries[k + 1] - boundaries[k])
  let curLabel = `bcv${segmentIndex}_${order[0]}`
  let curDuration = chunkDurations[0]

  for (let j = 1; j < order.length; j++) {
    const nextLabel = `bcv${segmentIndex}_${order[j]}`
    const nextDuration = chunkDurations[j]
    const t = clampTransitionDuration(curDuration, nextDuration)
    const offset = Math.max(0, curDuration - t)
    const outLabel = `bcvJoin${segmentIndex}_${j}`
    filterLines.push(`[${curLabel}][${nextLabel}]xfade=transition=${transitions[j - 1]}:duration=${t.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`)
    curLabel = outLabel
    curDuration = curDuration + nextDuration - t
  }

  return { videoLabel: curLabel, duration: curDuration, filterLines }
}

/**
 * Audio counterpart of {@link applyBeatCutVideoRemix} — same
 * boundaries/order so picture and sound stay in sync. Deliberately does NOT
 * chain `acrossfade` the way the video side chains `xfade`: verified with a
 * real ffmpeg render that chained `acrossfade` deadlocks (never produces a
 * single frame) whenever the join order doesn't match the chunks' original
 * creation order — exactly what a shuffle produces. `concat` (a hard join,
 * no blend) is immune to that and was confirmed to render correctly under
 * every reordering tested. The final `atrim` crops it to the exact duration
 * the video side ends up at after its own xfade joins shrink it (identical
 * clamp math on the identical chunk durations/order, so they always agree)
 * — required so this segment's audio and video stay the same length once
 * concatenated with the other two segments.
 */
function applyBeatCutAudioRemix(inLabel: string, plan: ChunkPlan, segmentIndex: number): { audioLabel: string; filterLines: string[] } {
  const { boundaries, order } = plan
  const chunkCount = boundaries.length - 1
  const filterLines: string[] = []

  const splitLabels = Array.from({ length: chunkCount }, (_, k) => `bcaSrc${segmentIndex}_${k}`)
  filterLines.push(`[${inLabel}]asplit=${chunkCount}${splitLabels.map((l) => `[${l}]`).join('')}`)

  const chunkLabels: string[] = []
  for (let k = 0; k < chunkCount; k++) {
    const label = `bca${segmentIndex}_${k}`
    filterLines.push(
      `[${splitLabels[k]}]atrim=start=${boundaries[k].toFixed(3)}:end=${boundaries[k + 1].toFixed(3)},asetpts=PTS-STARTPTS[${label}]`
    )
    chunkLabels.push(label)
  }

  const orderedLabels = order.map((k) => chunkLabels[k])
  const concatLabel = `bcaConcat${segmentIndex}`
  filterLines.push(`${orderedLabels.map((l) => `[${l}]`).join('')}concat=n=${chunkCount}:v=0:a=1[${concatLabel}]`)

  const chunkDurations = order.map((k) => boundaries[k + 1] - boundaries[k])
  let finalDuration = chunkDurations[0]
  for (let j = 1; j < chunkDurations.length; j++) {
    const t = clampTransitionDuration(finalDuration, chunkDurations[j])
    finalDuration = finalDuration + chunkDurations[j] - t
  }

  const outLabel = `bcaFinal${segmentIndex}`
  filterLines.push(`[${concatLabel}]atrim=0:${finalDuration.toFixed(3)},asetpts=PTS-STARTPTS[${outLabel}]`)

  return { audioLabel: outLabel, filterLines }
}

/**
 * One punch-effect filter chain per Beat FX style. `t` is LOCAL to whatever
 * chunk this runs on (reset to 0 by the `setpts=PTS-STARTPTS` that always
 * precedes it in {@link applyBeatFx}) — so every style peaks exactly at the
 * chunk's first frame (the beat instant) and decays over a short window,
 * confirmed with real renders (a measurable test pattern for zoomPunch/
 * shake; visual/exit-code checks for the rest) before shipping:
 * - zoomPunch/shake use `scale` (which supports a `t`-driven `eval=frame`
 *   expression) to animate size, then a FIXED-size `crop` to frame it back
 *   down — `crop`'s own w/h expressions are evaluated once at init, before
 *   `t` exists, so they can never be the animated part; only `crop`'s x/y
 *   support `t` per frame, which is what shake actually leans on.
 * - flash/hueSwing use native per-frame `t` expressions directly.
 * - rgbGlitch/invertBlip use fixed (non-expression) filter params gated by
 *   `enable=` timeline editing — a hard on/off blip, not a smooth decay,
 *   which reads as more of a deliberate "glitch" than an eased effect.
 */
function beatFxStyleChain(style: BeatFxStyle, nativeWidth: number, nativeHeight: number): string {
  switch (style) {
    case 'zoomPunch':
      return (
        `scale=w='trunc(iw*(1+0.28*max(0,1-t/0.16))/2)*2':h='trunc(ih*(1+0.28*max(0,1-t/0.16))/2)*2':eval=frame,` +
        `crop=${nativeWidth}:${nativeHeight}:(in_w-out_w)/2:(in_h-out_h)/2`
      )
    case 'shake':
      return (
        `scale=w='trunc(iw*1.1/2)*2':h='trunc(ih*1.1/2)*2',` +
        `crop=${nativeWidth}:${nativeHeight}:x='(in_w-out_w)/2+in_w*0.035*sin(t*100)*max(0,1-t/0.18)':y='(in_h-out_h)/2+in_h*0.035*cos(t*85)*max(0,1-t/0.18)'`
      )
    case 'flash':
      return `eq=brightness='0.65*max(0,1-t/0.12)':eval=frame`
    case 'rgbGlitch':
      return `rgbashift=rh=16:bh=-16:edge=smear:enable='lt(t,0.14)'`
    case 'invertBlip':
      return `negate=enable='lt(t,0.07)'`
    case 'hueSwing':
      return `hue=h='65*max(0,1-t/0.15)':s='1+0.35*max(0,1-t/0.15)'`
  }
}

/**
 * Splits `inLabel` into `boundaries`-defined chunks, IN THEIR ORIGINAL
 * ORDER (no shuffle — that's Beat Cut's job), and burns a randomly-picked
 * punch style into the start of each one before hard-concatenating them
 * back together. Total duration is exactly preserved (no xfade, no
 * overlap), which is what makes it safe to run before Beat Cut: Beat Cut's
 * own boundaries (computed independently) stay valid on this output.
 */
function applyBeatFx(
  inLabel: string,
  boundaries: number[],
  styles: BeatFxStyle[],
  seed: number,
  segmentIndex: number,
  nativeWidth: number,
  nativeHeight: number
): { videoLabel: string; filterLines: string[] } {
  const chunkCount = boundaries.length - 1
  const filterLines: string[] = []

  const splitLabels = Array.from({ length: chunkCount }, (_, k) => `bfxSrc${segmentIndex}_${k}`)
  filterLines.push(`[${inLabel}]split=${chunkCount}${splitLabels.map((l) => `[${l}]`).join('')}`)

  const pickStyle = mulberry32(seed)
  const outLabels: string[] = []
  for (let k = 0; k < chunkCount; k++) {
    const style = styles[Math.floor(pickStyle() * styles.length)]
    const outLabel = `bfx${segmentIndex}_${k}`
    // setsar=1 matters here: zoomPunch/shake's `scale` expressions round
    // width/height to the nearest even number independently, which at some
    // values of `t` doesn't preserve the exact input aspect ratio — ffmpeg
    // compensates by nudging SAR instead of distorting the image, and that
    // nudge varies frame to frame. Left alone, the `concat` below (which
    // needs every input to report the SAME SAR) fails outright — confirmed
    // with a real render ("Input link parameters... do not match").
    filterLines.push(
      `[${splitLabels[k]}]trim=start=${boundaries[k].toFixed(3)}:end=${boundaries[k + 1].toFixed(3)},setpts=PTS-STARTPTS,${beatFxStyleChain(style, nativeWidth, nativeHeight)},setsar=1[${outLabel}]`
    )
    outLabels.push(outLabel)
  }

  const concatLabel = `bfxOut${segmentIndex}`
  filterLines.push(`${outLabels.map((l) => `[${l}]`).join('')}concat=n=${chunkCount}:v=1:a=0[${concatLabel}]`)

  return { videoLabel: concatLabel, filterLines }
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

/**
 * `durations` must be each segment's ACTUAL rendered length — the nominal
 * (trim/speed-adjusted) duration normally, but the shrunk post-Beat-Cut
 * length whenever that segment has a plan. Using the nominal duration here
 * for a Beat-Cut segment tells fade/afade to start at a timestamp past where
 * that segment's stream actually ends, which starves the filter of frames
 * it's still waiting on — confirmed with a real render to silently collapse
 * the whole output to a fraction of its intended length instead of erroring.
 */
function buildFadeGraph(
  durations: number[],
  videoLabels: string[],
  audioLabels: string[],
  filterLines: string[],
  settings: ExportSettings,
  extraInputArgs: string[]
): FilterGraphResult {
  const T = settings.transitionDuration

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

/** See the note on {@link buildFadeGraph} — `durations` must be each segment's ACTUAL rendered length. */
function buildCrossfadeGraph(
  durations: number[],
  videoLabels: string[],
  audioLabels: string[],
  filterLines: string[],
  settings: ExportSettings,
  extraInputArgs: string[],
  style: BeatTransitionStyle
): FilterGraphResult {
  const t1 = Math.min(settings.transitionDuration, Math.max(0.05, Math.min(durations[0], durations[1]) - 0.1))

  filterLines.push(
    `[${videoLabels[0]}][${videoLabels[1]}]xfade=transition=${style}:duration=${t1}:offset=${Math.max(0, durations[0] - t1)}[vx01]`
  )
  filterLines.push(`[${audioLabels[0]}][${audioLabels[1]}]acrossfade=d=${t1}[ax01]`)

  const mergedDuration01 = durations[0] + durations[1] - t1
  const t2 = Math.min(settings.transitionDuration, Math.max(0.05, Math.min(mergedDuration01, durations[2]) - 0.1))

  filterLines.push(
    `[vx01][${videoLabels[2]}]xfade=transition=${style}:duration=${t2}:offset=${Math.max(0, mergedDuration01 - t2)}[outv]`
  )
  filterLines.push(`[ax01][${audioLabels[2]}]acrossfade=d=${t2}[outa]`)

  return {
    extraInputArgs,
    filterComplex: filterLines.join(';'),
    videoOutputLabel: 'outv',
    audioOutputLabel: 'outa'
  }
}
