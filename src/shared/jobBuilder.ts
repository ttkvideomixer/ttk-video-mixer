import type { CombinationSelectionSettings, CreativeVariationSettings, GenerationJob, HookText, VideoFile } from './types'
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
    projectSeed
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

  const distributedCtaPhrases = visualCtaEnabled ? distributeCtaPhrases(total, projectSeed + 2003) : null
  const variationSequence = buildVariationSequence(creativeVariation, total, projectSeed + 3001)

  const jobs = selected.map((entry, i) => {
    const hook = hooks[entry.hookIndex]
    const body = bodies[entry.bodyIndex]
    const cta = ctas[entry.ctaIndex]

    const textIndex = multiply ? entry.hookTextIndex : (distributedTextIndexes?.[i] ?? null)
    const hookText = textIndex !== null && textIndex !== undefined ? enabledHookTexts[textIndex] : null
    const visualCtaPhrase = distributedCtaPhrases ? distributedCtaPhrases[i] : null

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
