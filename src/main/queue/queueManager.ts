import { existsSync } from 'node:fs'
import { rm, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import type {
  CreativeVariationSettings,
  ExportSettings,
  GenerationJob,
  GenerationSummary,
  JobStatus,
  LogEntry,
  PreviewOverlaysState,
  SilenceTrimSettings
} from '@shared/types'
import { deriveRetryVariation, buildVariationSignature } from '@shared/variationParams'
import { MAX_VARIATION_RETRY_ATTEMPTS } from '@shared/defaults'
import { processJob as defaultProcessJob, type ProcessJobHandle, type ProcessJobInput } from '../ffmpeg/videoProcessor'
import { hammingDistanceHex } from '../ffmpeg/fingerprint'
import { getDiskSpaceInfo } from '../utils/diskSpace'

export interface QueueCallbacks {
  onJobUpdated: (job: GenerationJob) => void
  onSummary: (summary: GenerationSummary) => void
  onLog: (entry: LogEntry) => void
  onFinished: (summary: GenerationSummary) => void
}

export type ProcessJobFn = (
  input: ProcessJobInput,
  onProgress?: (ratio: number) => void
) => ProcessJobHandle

export interface QueueDeps {
  processJob: ProcessJobFn
}

export interface QueueRunOptions {
  exportSettings: ExportSettings
  overlays: PreviewOverlaysState
  silenceTrim: SilenceTrimSettings
  creativeVariation: CreativeVariationSettings
  projectSeed: number
  projectName: string
}

type QueueState = 'idle' | 'running' | 'paused' | 'canceled' | 'finished'

/** Fingerprints considered "practically the same image" (out of 192 bits total, 3 frames x 64 bits). */
const SIMILARITY_HAMMING_THRESHOLD = 4

/**
 * Below this much free space, stop starting NEW jobs rather than let one
 * fail mid-write (or fail the temp->final rename right after) with a raw
 * filesystem error — the user explicitly wants generation to keep going
 * right up to the edge of their disk, not stop early with an arbitrary
 * conservative margin, so this is deliberately small: just enough to
 * comfortably finish whatever's already in flight at the configured
 * concurrency without ever truly hitting zero.
 */
const MIN_FREE_BYTES_TO_START_JOB = 500 * 1024 * 1024

/**
 * Runs a fixed list of ffmpeg jobs with a bounded number of concurrent
 * ffmpeg processes. Never starts more than `concurrency` processes at once,
 * so a 1000-job run cannot fork 1000 ffmpeg processes and lock up the
 * machine. Also guards against exact/near-exact duplicate output: when
 * creative variation is enabled, a render whose hash or visual fingerprint
 * matches an earlier one in this run is retried with nudged parameters (up
 * to a small limit) instead of being accepted as-is.
 */
export class GenerationQueue {
  private jobs: GenerationJob[]
  private options: QueueRunOptions
  private callbacks: QueueCallbacks
  private state: QueueState = 'idle'
  private activeHandles = new Map<string, ProcessJobHandle>()
  private activeCount = 0
  private cursor = 0
  private deps: QueueDeps
  private usedHashes = new Map<string, string>()
  private usedFingerprints: { jobId: string; fingerprint: string }[] = []

  constructor(
    jobs: GenerationJob[],
    options: QueueRunOptions,
    callbacks: QueueCallbacks,
    deps: QueueDeps = { processJob: defaultProcessJob }
  ) {
    this.jobs = jobs
    this.options = options
    this.callbacks = callbacks
    this.deps = deps
  }

  start(): void {
    if (this.state === 'running') return
    this.state = 'running'
    this.pump()
  }

  pause(): void {
    if (this.state !== 'running') return
    this.state = 'paused'
    this.emitSummary()
  }

  resume(): void {
    if (this.state !== 'paused') return
    this.state = 'running'
    this.pump()
  }

  cancel(): void {
    this.state = 'canceled'
    for (const handle of this.activeHandles.values()) handle.cancel()
    for (const job of this.jobs) {
      if (job.status === 'pending') job.status = 'canceled'
    }
    this.emitSummary()
    this.callbacks.onFinished(this.getSummary())
  }

  retryErrors(): void {
    for (const job of this.jobs) {
      if (job.status === 'error') {
        job.status = 'pending'
        job.error = null
        job.progress = 0
        this.callbacks.onJobUpdated(job)
      }
    }
    this.cursor = 0
    if (this.state === 'finished' || this.state === 'canceled') this.state = 'idle'
    this.start()
  }

  getSummary(): GenerationSummary {
    const summary: GenerationSummary = {
      total: this.jobs.length,
      completed: 0,
      errors: 0,
      skipped: 0,
      processing: 0,
      pending: 0
    }
    for (const job of this.jobs) {
      if (job.status === 'done') summary.completed++
      else if (job.status === 'skipped') {
        summary.completed++
        summary.skipped++
      } else if (job.status === 'error') summary.errors++
      else if (job.status === 'processing') summary.processing++
      else if (job.status === 'pending') summary.pending++
    }
    return summary
  }

  private emitSummary(): void {
    this.callbacks.onSummary(this.getSummary())
  }

  private updateJob(job: GenerationJob, status: JobStatus, extra: Partial<GenerationJob> = {}): void {
    job.status = status
    Object.assign(job, extra)
    this.callbacks.onJobUpdated(job)
    this.emitSummary()
  }

  private pump(): void {
    if (this.state !== 'running') return

    while (this.activeCount < this.options.exportSettings.concurrency && this.cursor < this.jobs.length) {
      const job = this.jobs[this.cursor]
      this.cursor++
      if (job.status === 'done' || job.status === 'skipped' || job.status === 'canceled') {
        continue
      }
      this.runJob(job)
    }

    if (this.activeCount === 0 && this.cursor >= this.jobs.length && this.state === 'running') {
      this.state = 'finished'
      this.emitSummary()
      this.callbacks.onFinished(this.getSummary())
    }
  }

  /** True when a fresh set of variation parameters could plausibly produce a different-looking render. */
  private canRetryVariation(): boolean {
    return this.options.creativeVariation.enabled
  }

  private findCollision(sha256: string, fingerprint: string, ownJobId: string): string | null {
    const hashOwner = this.usedHashes.get(sha256)
    if (hashOwner && hashOwner !== ownJobId) return hashOwner

    for (const entry of this.usedFingerprints) {
      if (entry.jobId === ownJobId) continue
      if (hammingDistanceHex(fingerprint, entry.fingerprint) <= SIMILARITY_HAMMING_THRESHOLD) {
        return entry.jobId
      }
    }
    return null
  }

  private registerResult(jobId: string, sha256: string, fingerprint: string): void {
    this.usedHashes.set(sha256, jobId)
    this.usedFingerprints.push({ jobId, fingerprint })
  }

  private buildProcessInput(job: GenerationJob): ProcessJobInput {
    return {
      hookPath: job.hookPath,
      bodyPath: job.bodyPath,
      ctaPath: job.ctaPath,
      outputPath: job.outputPath,
      videoMixerId: job.videoMixerId,
      projectName: this.options.projectName,
      settings: this.options.exportSettings,
      overlays: this.options.overlays,
      silenceTrimEnabled: this.options.silenceTrim.enabled,
      hookTextContent: job.hookTextContent,
      visualCtaPhrase: job.visualCtaPhrase,
      hookTextImagePath: job.hookTextImagePath,
      visualCtaImagePath: job.visualCtaImagePath,
      framePath: job.framePath,
      muteHook: job.muteHook,
      muteBody: job.muteBody,
      muteCta: job.muteCta,
      hookAudioPath: job.hookAudioPath,
      bodyAudioPath: job.bodyAudioPath,
      ctaAudioPath: job.ctaAudioPath,
      fullAudioPath: job.fullAudioPath,
      textMode: job.textMode,
      beatCutHook: job.beatCutHook,
      beatCutBody: job.beatCutBody,
      beatCutCta: job.beatCutCta,
      beatCutSeed: job.beatCutSeed,
      beatCutFallbackChunkCount: job.beatCutFallbackChunkCount,
      beatCutAllowedTransitions: job.beatCutAllowedTransitions,
      beatFxHook: job.beatFxHook,
      beatFxBody: job.beatFxBody,
      beatFxCta: job.beatFxCta,
      beatFxSeed: job.beatFxSeed,
      beatFxFallbackChunkCount: job.beatFxFallbackChunkCount,
      beatFxAllowedStyles: job.beatFxAllowedStyles,
      hookBeatGrid: job.hookBeatGrid,
      bodyBeatGrid: job.bodyBeatGrid,
      ctaBeatGrid: job.ctaBeatGrid,
      fullBeatGrid: job.fullBeatGrid,
      variation: job.variation
    }
  }

  private async runJob(job: GenerationJob): Promise<void> {
    this.activeCount++

    const space = await getDiskSpaceInfo(dirname(job.outputPath))
    if (space.freeBytes >= 0 && space.freeBytes < MIN_FREE_BYTES_TO_START_JOB) {
      // Pause instead of starting a job that's likely to fail partway
      // through (ffmpeg write error, or the temp->final rename finding
      // nothing there) once the disk is nearly full. The job itself stays
      // 'pending' — resetting the cursor means Resume (after the user frees
      // space) picks up this exact job again, not just whatever comes next.
      this.activeCount--
      if (this.state === 'running') {
        this.state = 'paused'
        this.cursor = 0
        this.callbacks.onLog({
          id: `diskspace-${Date.now()}`,
          timestamp: Date.now(),
          fileName: job.outputFileName,
          status: 'error',
          message: `Geração pausada: só restam ${space.availableFormatted} de espaço livre no disco. Libere espaço e clique em Retomar.`
        })
        this.emitSummary()
      }
      return
    }

    if (!this.options.exportSettings.overwriteExisting && (await fileExistsAndNonEmpty(job.outputPath))) {
      this.updateJob(job, 'skipped', { progress: 1, finishedAt: Date.now() })
      this.callbacks.onLog({
        id: `${job.id}-skip`,
        timestamp: Date.now(),
        fileName: job.outputFileName,
        status: 'skipped',
        message: 'Arquivo ja existia, geracao pulada.'
      })
      this.activeCount--
      this.pump()
      return
    }

    this.updateJob(job, 'processing', { startedAt: Date.now() })

    try {
      await this.renderWithDuplicateGuard(job)
      this.updateJob(job, 'done', { progress: 1, finishedAt: Date.now(), error: null })
      this.callbacks.onLog({
        id: `${job.id}-done`,
        timestamp: Date.now(),
        fileName: job.outputFileName,
        status: 'done',
        message: 'Concluido com sucesso.'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message === 'CANCELED') {
        this.updateJob(job, 'canceled', { finishedAt: Date.now() })
      } else {
        this.updateJob(job, 'error', { error: message, finishedAt: Date.now() })
        this.callbacks.onLog({
          id: `${job.id}-error`,
          timestamp: Date.now(),
          fileName: job.outputFileName,
          status: 'error',
          message
        })
      }
    } finally {
      this.activeHandles.delete(job.id)
      this.activeCount--
      this.pump()
    }
  }

  /** Renders a job, and if the result collides with an earlier one, retries with nudged variation parameters. */
  private async renderWithDuplicateGuard(job: GenerationJob): Promise<void> {
    for (let attempt = 0; attempt <= MAX_VARIATION_RETRY_ATTEMPTS; attempt++) {
      const handle = this.deps.processJob(this.buildProcessInput(job), (ratio) => {
        job.progress = ratio
        this.callbacks.onJobUpdated(job)
      })
      this.activeHandles.set(job.id, handle)

      const result = await handle.promise
      this.activeHandles.delete(job.id)

      if (!this.canRetryVariation()) {
        this.registerResult(job.id, result.sha256, result.visualFingerprint)
        job.sha256 = result.sha256
        job.visualFingerprint = result.visualFingerprint
        return
      }

      const collisionWith = this.findCollision(result.sha256, result.visualFingerprint, job.id)
      if (!collisionWith) {
        this.registerResult(job.id, result.sha256, result.visualFingerprint)
        job.sha256 = result.sha256
        job.visualFingerprint = result.visualFingerprint
        return
      }

      await rm(job.outputPath, { force: true }).catch(() => undefined)

      if (attempt === MAX_VARIATION_RETRY_ATTEMPTS) {
        throw new Error(
          `Nao foi possivel gerar uma variacao visualmente unica apos ${MAX_VARIATION_RETRY_ATTEMPTS} tentativas (colidiu com ${collisionWith}).`
        )
      }

      job.attempt = attempt + 1
      job.variation = deriveRetryVariation(this.options.creativeVariation, this.options.projectSeed, job.attempt)
      job.variationSignature = [
        job.hookId,
        job.bodyId,
        job.ctaId,
        job.hookTextId ?? 'HT0',
        job.visualCtaPhrase ?? 'VC0',
        buildVariationSignature(job.variation)
      ].join('|')
    }
  }
}

async function fileExistsAndNonEmpty(path: string): Promise<boolean> {
  if (!existsSync(path)) return false
  try {
    const info = await stat(path)
    return info.isFile() && info.size > 0
  } catch {
    return false
  }
}
