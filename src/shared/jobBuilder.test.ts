import { describe, expect, it } from 'vitest'
import { buildGenerationJobs, type BuildJobsParams } from './jobBuilder'
import type { CreativeVariationSettings, VideoFile } from './types'
import { DEFAULT_AUDIO_SETTINGS, DEFAULT_BEAT_CUT_SETTINGS, DEFAULT_CREATIVE_VARIATION_SETTINGS, DEFAULT_TEXT_MODE } from './defaults'

function makeVideos(category: VideoFile['category'], count: number): VideoFile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${category}-${i}`,
    name: `${category}${i + 1}.mp4`,
    path: `C:\\videos\\${category}${i + 1}.mp4`,
    category,
    order: i,
    duration: 5,
    width: 1080,
    height: 1920,
    fps: 30,
    hasAudio: true,
    thumbnailDataUrl: null,
    probeError: null
  }))
}

function baseParams(): BuildJobsParams {
  return {
    hooks: makeVideos('hook', 10),
    bodies: makeVideos('body', 10),
    ctas: makeVideos('cta', 10),
    prefix: 'video',
    outputFolder: 'C:\\Videos\\Campanha',
    combinationSettings: { mode: 'all', maxCombinations: null, shuffle: false, multiplyByHookText: false },
    hookTexts: [],
    visualCtaEnabled: false,
    creativeVariation: { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: false },
    projectSeed: 42,
    frameFilePaths: [],
    audioSettings: DEFAULT_AUDIO_SETTINGS,
    beatCutSettings: DEFAULT_BEAT_CUT_SETTINGS,
    textMode: DEFAULT_TEXT_MODE
  }
}

describe('buildGenerationJobs', () => {
  it('builds 1000 jobs for a 10x10x10 project with unique output paths', () => {
    const jobs = buildGenerationJobs(baseParams())

    expect(jobs).toHaveLength(1000)
    expect(new Set(jobs.map((j) => j.outputPath)).size).toBe(1000)
    expect(new Set(jobs.map((j) => j.videoMixerId)).size).toBe(1000)
    expect(jobs.every((j) => j.hookTextContent === null && j.visualCtaPhrase === null)).toBe(true)
  })

  it('respects a combination limit while keeping unique outputs', () => {
    const params = baseParams()
    params.combinationSettings = { ...params.combinationSettings, mode: 'limit', maxCombinations: 100 }
    const jobs = buildGenerationJobs(params)

    expect(jobs).toHaveLength(100)
    expect(new Set(jobs.map((j) => j.outputPath)).size).toBe(100)
  })

  it('distributes hook texts across jobs without multiplying the total', () => {
    const params = baseParams()
    params.hookTexts = Array.from({ length: 12 }, (_, i) => ({
      id: `ht-${i}`,
      text: `Texto ${i}`,
      order: i,
      enabled: true
    }))
    const jobs = buildGenerationJobs(params)

    expect(jobs).toHaveLength(1000)
    expect(jobs.every((j) => j.hookTextContent !== null)).toBe(true)
    const counts = new Map<string, number>()
    for (const j of jobs) counts.set(j.hookTextContent as string, (counts.get(j.hookTextContent as string) ?? 0) + 1)
    expect(counts.size).toBe(12)
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(50)
      expect(count).toBeLessThan(120)
    }
  })

  it('multiplies the total when multiplyByHookText is enabled', () => {
    const params = baseParams()
    params.hookTexts = Array.from({ length: 12 }, (_, i) => ({
      id: `ht-${i}`,
      text: `Texto ${i}`,
      order: i,
      enabled: true
    }))
    params.combinationSettings = { ...params.combinationSettings, multiplyByHookText: true }
    const jobs = buildGenerationJobs(params)

    expect(jobs).toHaveLength(12000)
    expect(new Set(jobs.map((j) => j.outputFileName)).size).toBe(12000)
  })

  it('assigns a visual CTA phrase to every job when enabled, and none when disabled', () => {
    const params = baseParams()
    params.visualCtaEnabled = true
    const jobs = buildGenerationJobs(params)
    expect(jobs.every((j) => typeof j.visualCtaPhrase === 'string')).toBe(true)

    const disabled = buildGenerationJobs(baseParams())
    expect(disabled.every((j) => j.visualCtaPhrase === null)).toBe(true)
  })

  it('assigns a frame to every job only when frameFilePaths is provided', () => {
    const frames = ['C:\\molduras\\a.png', 'C:\\molduras\\b.png', 'C:\\molduras\\c.png']
    const withFrames = buildGenerationJobs({ ...baseParams(), frameFilePaths: frames })
    expect(withFrames.every((j) => j.framePath !== null && frames.includes(j.framePath))).toBe(true)

    const withoutFrames = buildGenerationJobs(baseParams())
    expect(withoutFrames.every((j) => j.framePath === null)).toBe(true)
  })

  it('uses every frame a near-equal number of times across the batch (cycles instead of picking with replacement)', () => {
    const frames = ['C:\\molduras\\a.png', 'C:\\molduras\\b.png', 'C:\\molduras\\c.png']
    const jobs = buildGenerationJobs({ ...baseParams(), frameFilePaths: frames })
    expect(jobs.length).toBeGreaterThan(frames.length)

    const counts = frames.map((f) => jobs.filter((j) => j.framePath === f).length)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('assigns audio tracks to every job only when tracks are provided for that pool', () => {
    const params = baseParams()
    params.audioSettings = {
      ...DEFAULT_AUDIO_SETTINGS,
      hookTracks: [
        { id: 'h1', name: 'h1.mp3', path: 'C:\\audio\\h1.mp3' },
        { id: 'h2', name: 'h2.mp3', path: 'C:\\audio\\h2.mp3' }
      ],
      fullTracks: [{ id: 'f1', name: 'f1.mp3', path: 'C:\\audio\\f1.mp3' }]
    }
    const jobs = buildGenerationJobs(params)

    expect(jobs.every((j) => j.hookAudioPath !== null && ['C:\\audio\\h1.mp3', 'C:\\audio\\h2.mp3'].includes(j.hookAudioPath))).toBe(true)
    expect(jobs.every((j) => j.fullAudioPath === 'C:\\audio\\f1.mp3')).toBe(true)
    expect(jobs.every((j) => j.bodyAudioPath === null && j.ctaAudioPath === null)).toBe(true)

    const withoutAudio = buildGenerationJobs(baseParams())
    expect(withoutAudio.every((j) => j.hookAudioPath === null && j.bodyAudioPath === null && j.ctaAudioPath === null && j.fullAudioPath === null)).toBe(true)
  })

  it('uses every audio track a near-equal number of times across the batch', () => {
    const params = baseParams()
    const tracks = [
      { id: 'b1', name: 'b1.mp3', path: 'C:\\audio\\b1.mp3' },
      { id: 'b2', name: 'b2.mp3', path: 'C:\\audio\\b2.mp3' },
      { id: 'b3', name: 'b3.mp3', path: 'C:\\audio\\b3.mp3' }
    ]
    params.audioSettings = { ...DEFAULT_AUDIO_SETTINGS, bodyTracks: tracks }
    const jobs = buildGenerationJobs(params)
    expect(jobs.length).toBeGreaterThan(tracks.length)

    const counts = tracks.map((t) => jobs.filter((j) => j.bodyAudioPath === t.path).length)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('copies beatCutSettings flags onto every job and gives each job a unique, deterministic seed', () => {
    const params = baseParams()
    params.beatCutSettings = { ...DEFAULT_BEAT_CUT_SETTINGS, hookEnabled: true, ctaEnabled: true, fallbackChunkCount: 6 }
    const jobs = buildGenerationJobs(params)

    expect(jobs.every((j) => j.beatCutHook === true && j.beatCutBody === false && j.beatCutCta === true)).toBe(true)
    expect(jobs.every((j) => j.beatCutFallbackChunkCount === 6)).toBe(true)
    expect(new Set(jobs.map((j) => j.beatCutSeed)).size).toBe(jobs.length)

    const again = buildGenerationJobs(params)
    expect(again.map((j) => j.beatCutSeed)).toEqual(jobs.map((j) => j.beatCutSeed))
  })

  it('forces visualCtaPhrase to null in fullSpan text mode even when visualCtaEnabled is true', () => {
    const params = baseParams()
    params.visualCtaEnabled = true
    params.textMode = 'fullSpan'
    const jobs = buildGenerationJobs(params)
    expect(jobs.every((j) => j.visualCtaPhrase === null)).toBe(true)
    expect(jobs.every((j) => j.textMode === 'fullSpan')).toBe(true)
  })

  it('copies mute flags from audioSettings onto every job unchanged', () => {
    const params = baseParams()
    params.audioSettings = { ...DEFAULT_AUDIO_SETTINGS, muteHook: true, muteCta: true }
    const jobs = buildGenerationJobs(params)
    expect(jobs.every((j) => j.muteHook === true && j.muteBody === false && j.muteCta === true)).toBe(true)
  })

  it('gives every job a variation signature that is unique across the whole batch', () => {
    const params = baseParams()
    const variation: CreativeVariationSettings = { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: true }
    params.creativeVariation = variation
    const jobs = buildGenerationJobs(params)
    expect(new Set(jobs.map((j) => j.variationSignature)).size).toBe(jobs.length)
  })

  it('is reproducible for the same seed and settings', () => {
    const params = baseParams()
    params.creativeVariation = { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: true }
    const a = buildGenerationJobs(params)
    const b = buildGenerationJobs(params)
    expect(a.map((j) => j.variation)).toEqual(b.map((j) => j.variation))
    expect(a.map((j) => j.outputFileName)).toEqual(b.map((j) => j.outputFileName))
  })

  it('never leaves 3+ consecutive jobs with the same hook when more than one hook exists', () => {
    const jobs = buildGenerationJobs(baseParams())
    let run = 1
    for (let i = 1; i < jobs.length; i++) {
      run = jobs[i].hookId === jobs[i - 1].hookId ? run + 1 : 1
      expect(run).toBeLessThan(3)
    }
  })
})
