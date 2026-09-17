import type {
  AudioSettings,
  BeatCutSettings,
  CombinationSelectionSettings,
  CreativeVariationSettings,
  GenerationJob,
  HookText,
  TextMode,
  VideoFile
} from './types'
import { generateCombinations, selectCombinations } from './combinations'
import { buildCombinationLabel, buildOutputFileName } from './naming'
import { joinWindowsPath } from './pathUtils'
import { CTA_PHRASES, distributeCtaPhrases, distributeEvenly } from './ctaPhrases'
import { buildVariationSequence, buildVariationSignature } from './variationParams'
import { roundRobinByGroup } from './queueDistribution'
import { buildVideoMixerId } from './videoMixerId'

export interface BuildJobsParams {
  hooks: VideoFile[]
  bodies: VideoFile[]
  ctas: VideoFile[]
  prefix: string
  outputFolder: string
  combinationSettings: CombinationSelectionSettings
  hookTexts: HookText[]
  visualCtaEnabled: boolean
  creativeVariation: CreativeVariationSettings
  projectSeed: number
  /** Molduras: pass a non-empty list only when the feature is enabled AND the export resolution is frame-eligible (9:16) — see FRAME_ELIGIBLE_RESOLUTION. */
  frameFilePaths: string[]
  audioSettings: AudioSettings
  beatCutSettings: BeatCutSettings
  textMode: TextMode
}

interface ExpandedEntry {
  hookIndex: number
  bodyIndex: number
  ctaIndex: number
  /** Set only in "cada texto gera uma nova variação" mode: exact text for this expanded slot. */
  hookTextIndex: number | null
}

/**
 * Turns the current hook/body/cta lists (plus optional hook texts, visual
 * CTA and creative variation settings) into the concrete list of jobs to
 * run. Output file names are always derived from the base G/C/CTA (and, in
 * multiply mode, the text index) — never from queue position — so sampling
 * and reordering below can never create a collision.
 */
export function buildGenerationJobs(params: BuildJobsParams): GenerationJob[] {
  const {
    hooks,
    bodies,
    ctas,
    prefix,
    outputFolder,
    combinationSettings,
    hookTexts,
    visualCtaEnabled,
    creativeVariation,
    projectSeed,
    frameFilePaths,
    audioSettings,
    beatCutSettings,
    textMode
  } = params

  const all = generateCombinations(hooks.length, bodies.length, ctas.length)
  const enabledHookTexts = hookTexts.filter((t) => t.enabled && t.text.trim().length > 0)
  const multiply = combinationSettings.multiplyByHookText && enabledHookTexts.length > 0

  const expanded: ExpandedEntry[] = multiply
    ? all.flatMap((combo) =>
        enabledHookTexts.map((_, ti) => ({
          hookIndex: combo.hookIndex,
          bodyIndex: combo.bodyIndex,
          ctaIndex: combo.ctaIndex,
          hookTextIndex: ti
        }))
      )
    : all.map((combo) => ({
        hookIndex: combo.hookIndex,
        bodyIndex: combo.bodyIndex,
        ctaIndex: combo.ctaIndex,
        hookTextIndex: null
      }))

  const selected = selectCombinations(expanded, combinationSettings)
  const total = selected.length

  const distributedTextIndexes =
    !multiply && enabledHookTexts.length > 0
      ? distributeEvenly(
          enabledHookTexts.map((_, i) => i),
          total,
          projectSeed + 1009
        )
      : null

  // Full-span text mode replaces the separate hook+CTA texts with one continuous
  // overlay (see textMode below) — the auto CTA phrase has nothing to pair with there.
  const distributedCtaPhrases = visualCtaEnabled && textMode !== 'fullSpan' ? distributeCtaPhrases(total, projectSeed + 2003) : null
  const distributedFramePaths = frameFilePaths.length > 0 ? distributeEvenly(frameFilePaths, total, projectSeed + 4007) : null
  const variationSequence = buildVariationSequence(creativeVariation, total, projectSeed + 3001)

  // Same distribute-without-repeat mechanism as hook texts/CTA phrases/
  // molduras, one independent pool per audio slot so they don't correlate.
  const distributedHookAudio =
    audioSettings.hookTracks.length > 0
      ? distributeEvenly(audioSettings.hookTracks.map((t) => t.path), total, projectSeed + 5011)
      : null
  const distributedBodyAudio =
    audioSettings.bodyTracks.length > 0
      ? distributeEvenly(audioSettings.bodyTracks.map((t) => t.path), total, projectSeed + 6007)
      : null
  const distributedCtaAudio =
    audioSettings.ctaTracks.length > 0
      ? distributeEvenly(audioSettings.ctaTracks.map((t) => t.path), total, projectSeed + 7001)
      : null
  const distributedFullAudio =
    audioSettings.fullTracks.length > 0
      ? distributeEvenly(audioSettings.fullTracks.map((t) => t.path), total, projectSeed + 8009)
      : null

  const jobs = selected.map((entry, i) => {
    const hook = hooks[entry.hookIndex]
    const body = bodies[entry.bodyIndex]
    const cta = ctas[entry.ctaIndex]

    const textIndex = multiply ? entry.hookTextIndex : (distributedTextIndexes?.[i] ?? null)
    const hookText = textIndex !== null && textIndex !== undefined ? enabledHookTexts[textIndex] : null
    const visualCtaPhrase = distributedCtaPhrases ? distributedCtaPhrases[i] : null
    const framePath = distributedFramePaths ? distributedFramePaths[i] : null
    const hookAudioPath = distributedHookAudio ? distributedHookAudio[i] : null
    const bodyAudioPath = distributedBodyAudio ? distributedBodyAudio[i] : null
    const ctaAudioPath = distributedCtaAudio ? distributedCtaAudio[i] : null
    const fullAudioPath = distributedFullAudio ? distributedFullAudio[i] : null

    const outputFileName = buildOutputFileName({
      prefix,
      hookIndex: entry.hookIndex,
      bodyIndex: entry.bodyIndex,
      ctaIndex: entry.ctaIndex,
      hookCount: hooks.length,
      bodyCount: bodies.length,
      ctaCount: ctas.length,
      textIndex: multiply ? (entry.hookTextIndex ?? 0) : undefined,
      textCount: multiply ? enabledHookTexts.length : undefined
    })

    const [hookLabel, bodyLabel, ctaLabel] = buildCombinationLabel({
      hookIndex: entry.hookIndex,
      bodyIndex: entry.bodyIndex,
      ctaIndex: entry.ctaIndex,
      hookCount: hooks.length,
      bodyCount: bodies.length,
      ctaCount: ctas.length
    }).split('+')

    const variation = variationSequence[i]
    const ctaPhraseId = visualCtaPhrase ? CTA_PHRASES.indexOf(visualCtaPhrase) : -1
    const variationSignature = [
      hook.id,
      body.id,
      cta.id,
      hookText ? hookText.id : 'HT0',
      ctaPhraseId >= 0 ? `VC${ctaPhraseId}` : 'VC0',
      framePath ?? 'FR0',
      hookAudioPath ?? 'HA0',
      bodyAudioPath ?? 'BA0',
      ctaAudioPath ?? 'CA0',
      fullAudioPath ?? 'FA0',
      buildVariationSignature(variation)
    ].join('|')

    const job: GenerationJob = {
      id: `job-${i}-${entry.hookIndex}-${entry.bodyIndex}-${entry.ctaIndex}${
        multiply ? `-t${entry.hookTextIndex}` : ''
      }`,
      index: i,
      hookId: hook.id,
      bodyId: body.id,
      ctaId: cta.id,
      hookPath: hook.path,
      bodyPath: body.path,
      ctaPath: cta.path,
      hookLabel,
      bodyLabel,
      ctaLabel,
      outputFileName,
      outputPath: joinWindowsPath(outputFolder, outputFileName),
      status: 'pending',
      error: null,
      progress: 0,
      startedAt: null,
      finishedAt: null,
      videoMixerId: '',
      hookTextId: hookText ? hookText.id : null,
      hookTextContent: hookText ? hookText.text : null,
      visualCtaPhrase,
      framePath,
      muteHook: audioSettings.muteHook,
      muteBody: audioSettings.muteBody,
      muteCta: audioSettings.muteCta,
      hookAudioPath,
      bodyAudioPath,
      ctaAudioPath,
      fullAudioPath,
      textMode,
      beatCutHook: beatCutSettings.hookEnabled,
      beatCutBody: beatCutSettings.bodyEnabled,
      beatCutCta: beatCutSettings.ctaEnabled,
      // Derived straight from the job index — deterministic and unique per job
      // without needing its own distribution pass; the beat grid itself (which
      // needs real file I/O) is resolved later, in the renderer, per-job.
      beatCutSeed: projectSeed + 9013 + i,
      beatCutFallbackChunkCount: beatCutSettings.fallbackChunkCount,
      beatCutAllowedTransitions: beatCutSettings.allowedTransitionStyles,
      hookBeatGrid: null,
      bodyBeatGrid: null,
      ctaBeatGrid: null,
      fullBeatGrid: null,
      variation,
      variationSignature,
      sha256: null,
      visualFingerprint: null,
      attempt: 0
    }

    return job
  })

  // Spread out consecutive same-hook runs in the processing order, without
  // touching file names, combinations, or which jobs exist.
  const reordered = roundRobinByGroup(jobs, (job) => job.hookId)

  return reordered.map((job, i) => ({ ...job, videoMixerId: buildVideoMixerId(i, reordered.length) }))
}
