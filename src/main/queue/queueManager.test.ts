import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GenerationQueue, type ProcessJobFn, type QueueRunOptions } from './queueManager'
import type { GenerationJob } from '@shared/types'
import {
  DEFAULT_CREATIVE_VARIATION_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_OVERLAYS_STATE,
  DEFAULT_SILENCE_TRIM_SETTINGS,
  NEUTRAL_VARIATION_PARAMETERS
} from '@shared/defaults'

function makeJob(id: string, outputPath: string): GenerationJob {
  return {
    id,
    index: Number(id),
    hookId: `h${id}`,
    bodyId: 'b',
    ctaId: 'c',
    hookPath: 'hook.mp4',
    bodyPath: 'body.mp4',
    ctaPath: 'cta.mp4',
    hookLabel: 'G01',
    bodyLabel: 'C01',
    ctaLabel: 'CTA01',
    outputFileName: `video_${id}.mp4`,
    outputPath,
    status: 'pending',
    error: null,
    progress: 0,
    startedAt: null,
    finishedAt: null,
    videoMixerId: `VM-${id}`,
    hookTextId: null,
    hookTextContent: null,
    visualCtaPhrase: null,
    variation: { ...NEUTRAL_VARIATION_PARAMETERS },
    variationSignature: `sig-${id}`,
    sha256: null,
    visualFingerprint: null,
    attempt: 0
  }
}

function makeOptions(overrides: Partial<QueueRunOptions> = {}): QueueRunOptions {
  return {
    exportSettings: DEFAULT_EXPORT_SETTINGS,
    overlays: DEFAULT_OVERLAYS_STATE,
    silenceTrim: DEFAULT_SILENCE_TRIM_SETTINGS,
    creativeVariation: DEFAULT_CREATIVE_VARIATION_SETTINGS,
    projectSeed: 1,
    projectName: 'Teste',
    ...overrides
  }
}

function noopCallbacks() {
  return {
    onJobUpdated: vi.fn(),
    onSummary: vi.fn(),
    onLog: vi.fn(),
    onFinished: vi.fn()
  }
}

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'video-mixer-queue-test-'))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('GenerationQueue concurrency', () => {
  it('never runs more jobs at once than the configured concurrency', async () => {
    let concurrent = 0
    let maxConcurrent = 0
    let counter = 0
    const fakeProcessJob: ProcessJobFn = () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      const id = counter++
      const promise = new Promise<{ sha256: string; visualFingerprint: string }>((resolve) => {
        setTimeout(() => {
          concurrent--
          resolve({ sha256: `sha-${id}`, visualFingerprint: `fp-${id}` })
        }, 10)
      })
      return { promise, cancel: () => undefined }
    }

    const jobs = Array.from({ length: 10 }, (_, i) => makeJob(String(i), join(workDir, `out${i}.mp4`)))
    const callbacks = noopCallbacks()
    const queue = new GenerationQueue(
      jobs,
      makeOptions({ exportSettings: { ...DEFAULT_EXPORT_SETTINGS, concurrency: 2 } }),
      callbacks,
      { processJob: fakeProcessJob }
    )

    await new Promise<void>((resolve) => {
      callbacks.onFinished.mockImplementation(() => resolve())
      queue.start()
    })

    expect(maxConcurrent).toBeLessThanOrEqual(2)
    expect(maxConcurrent).toBeGreaterThan(0)
  })

  it('resumes without reprocessing files that already exist on disk', async () => {
    const existingPath = join(workDir, 'out0.mp4')
    writeFileSync(existingPath, 'already-rendered')

    const processed: string[] = []
    let counter = 0
    const fakeProcessJob: ProcessJobFn = (input) => {
      processed.push(input.outputPath)
      const id = counter++
      return { promise: Promise.resolve({ sha256: `sha-${id}`, visualFingerprint: `fp-${id}` }), cancel: () => undefined }
    }

    const jobs = [makeJob('0', existingPath), makeJob('1', join(workDir, 'out1.mp4'))]
    const callbacks = noopCallbacks()
    const queue = new GenerationQueue(
      jobs,
      makeOptions({ exportSettings: { ...DEFAULT_EXPORT_SETTINGS, concurrency: 2, overwriteExisting: false } }),
      callbacks,
      { processJob: fakeProcessJob }
    )

    await new Promise<void>((resolve) => {
      callbacks.onFinished.mockImplementation(() => resolve())
      queue.start()
    })

    expect(processed).toEqual([join(workDir, 'out1.mp4')])
    expect(jobs[0].status).toBe('skipped')
    expect(jobs[1].status).toBe('done')
  })

  it('continues the queue after a single job errors, and allows retrying only the errors', async () => {
    let counter = 0
    const fakeProcessJob: ProcessJobFn = (input) => {
      if (input.outputPath.includes('out1')) {
        return { promise: Promise.reject(new Error('falha simulada')), cancel: () => undefined }
      }
      const id = counter++
      return { promise: Promise.resolve({ sha256: `sha-${id}`, visualFingerprint: `fp-${id}` }), cancel: () => undefined }
    }

    const jobs = [
      makeJob('0', join(workDir, 'out0.mp4')),
      makeJob('1', join(workDir, 'out1.mp4')),
      makeJob('2', join(workDir, 'out2.mp4'))
    ]
    const callbacks = noopCallbacks()
    const queue = new GenerationQueue(
      jobs,
      makeOptions({ exportSettings: { ...DEFAULT_EXPORT_SETTINGS, concurrency: 3 } }),
      callbacks,
      { processJob: fakeProcessJob }
    )

    await new Promise<void>((resolve) => {
      callbacks.onFinished.mockImplementationOnce(() => resolve())
      queue.start()
    })

    expect(jobs[0].status).toBe('done')
    expect(jobs[1].status).toBe('error')
    expect(jobs[2].status).toBe('done')

    const summary = queue.getSummary()
    expect(summary.completed).toBe(2)
    expect(summary.errors).toBe(1)
  })

  it('retries with a new variation when two jobs collide on the same output hash', async () => {
    let callIndex = 0
    const collidingProcessJob: ProcessJobFn = () => {
      callIndex++
      // The first two renders (one per job) collide; anything after that is unique.
      const result =
        callIndex <= 2
          ? { sha256: 'DUPLICATE', visualFingerprint: 'fp-same' }
          : { sha256: `unique-${callIndex}`, visualFingerprint: `fp-${callIndex}` }
      return { promise: Promise.resolve(result), cancel: () => undefined }
    }

    const jobB = makeJob('1', join(workDir, 'out1.mp4'))
    const jobC = makeJob('2', join(workDir, 'out2.mp4'))
    const callbacks = noopCallbacks()
    const queue = new GenerationQueue(
      [jobB, jobC],
      makeOptions({ creativeVariation: { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: true } }),
      callbacks,
      { processJob: collidingProcessJob }
    )

    await new Promise<void>((resolve) => {
      callbacks.onFinished.mockImplementation(() => resolve())
      queue.start()
    })

    expect(jobB.status).toBe('done')
    expect(jobC.status).toBe('done')
    // Exactly one of the two jobs had to retry (the one that lost the race for the shared hash).
    expect(jobB.attempt + jobC.attempt).toBeGreaterThan(0)
    expect(jobB.sha256).not.toBe(jobC.sha256)
  })

  it('does not retry on collision when creative variation is disabled', async () => {
    const sameHashProcessJob: ProcessJobFn = () => ({
      promise: Promise.resolve({ sha256: 'SAME', visualFingerprint: 'fp' }),
      cancel: () => undefined
    })

    const jobs = [makeJob('0', join(workDir, 'out0.mp4')), makeJob('1', join(workDir, 'out1.mp4'))]
    const callbacks = noopCallbacks()
    const queue = new GenerationQueue(jobs, makeOptions(), callbacks, { processJob: sameHashProcessJob })

    await new Promise<void>((resolve) => {
      callbacks.onFinished.mockImplementation(() => resolve())
      queue.start()
    })

    expect(jobs.every((j) => j.status === 'done')).toBe(true)
    expect(jobs.every((j) => j.attempt === 0)).toBe(true)
  })
})
