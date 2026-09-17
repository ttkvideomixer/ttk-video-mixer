import { describe, expect, it } from 'vitest'
import { buildCombinationsCsv } from './csv'
import type { GenerationJob } from '@shared/types'
import { NEUTRAL_VARIATION_PARAMETERS } from '@shared/defaults'

function makeJob(overrides: Partial<GenerationJob> = {}): GenerationJob {
  return {
    id: 'job-0',
    index: 0,
    hookId: 'h',
    bodyId: 'b',
    ctaId: 'c',
    hookPath: 'hook.mp4',
    bodyPath: 'body.mp4',
    ctaPath: 'cta.mp4',
    hookLabel: 'G01',
    bodyLabel: 'C01',
    ctaLabel: 'CTA01',
    outputFileName: 'video_G01_C01_CTA01.mp4',
    outputPath: 'C:\\out\\video_G01_C01_CTA01.mp4',
    status: 'done',
    error: null,
    progress: 1,
    startedAt: null,
    finishedAt: null,
    videoMixerId: 'VM-000001',
    hookTextId: null,
    hookTextContent: null,
    visualCtaPhrase: null,
    framePath: null,
    variation: NEUTRAL_VARIATION_PARAMETERS,
    variationSignature: 'sig',
    sha256: 'abc123',
    visualFingerprint: 'fp',
    attempt: 0,
    muteHook: false,
    muteBody: false,
    muteCta: false,
    hookAudioPath: null,
    bodyAudioPath: null,
    ctaAudioPath: null,
    fullAudioPath: null,
    textMode: 'perSegment',
    beatCutHook: false,
    beatCutBody: false,
    beatCutCta: false,
    beatCutSeed: 0,
    beatCutFallbackChunkCount: 4,
    beatCutAllowedTransitions: [],
    hookBeatGrid: null,
    bodyBeatGrid: null,
    ctaBeatGrid: null,
    fullBeatGrid: null,
    ...overrides
  }
}

describe('buildCombinationsCsv', () => {
  it('keeps the original columns first, in order', () => {
    const csv = buildCombinationsCsv([makeJob()])
    const header = csv.split('\r\n')[0].split(',')
    expect(header.slice(0, 6)).toEqual(['numero', 'gancho', 'corpo', 'cta', 'arquivo_saida', 'status'])
  })

  it('includes the new tracking columns', () => {
    const csv = buildCombinationsCsv([makeJob()])
    const header = csv.split('\r\n')[0].split(',')
    for (const col of ['video_id', 'variation_signature', 'sha256', 'visual_fingerprint', 'mirror']) {
      expect(header).toContain(col)
    }
  })

  it('escapes fields containing commas or quotes', () => {
    const csv = buildCombinationsCsv([makeJob({ hookTextContent: 'Olá, "mundo"' })])
    expect(csv).toContain('"Olá, ""mundo"""')
  })
})
