import { describe, expect, it } from 'vitest'
import { buildGenerationJobs, type BuildJobsParams } from './jobBuilder'
import type { CreativeVariationSettings, VideoFile } from './types'
import { DEFAULT_CREATIVE_VARIATION_SETTINGS } from './defaults'

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
    frameFilePaths: []
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
