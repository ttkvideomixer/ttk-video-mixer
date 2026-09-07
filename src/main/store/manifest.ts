import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GenerationJob } from '@shared/types'

export interface ManifestEntry {
  videoMixerId: string
  outputFileName: string
  status: GenerationJob['status']
  hook: string
  body: string
  cta: string
  hookText: string | null
  visualCta: string | null
  variationSignature: string
  sha256: string | null
  visualFingerprint: string | null
}

export interface ProjectManifest {
  projectName: string
  generatedAt: string
  total: number
  entries: ManifestEntry[]
}

/**
 * Writes (or overwrites) project-manifest.json in the output folder — the
 * authoritative, structured record of how each file was produced. Exists
 * because container metadata (see videoProcessor's comment on the mov
 * muxer) can only carry a couple of standard fields, not the full picture.
 */
export async function writeProjectManifest(outputFolder: string, projectName: string, jobs: GenerationJob[]): Promise<string> {
  const manifest: ProjectManifest = {
    projectName,
    generatedAt: new Date().toISOString(),
    total: jobs.length,
    entries: jobs.map((job) => ({
      videoMixerId: job.videoMixerId,
      outputFileName: job.outputFileName,
      status: job.status,
      hook: job.hookLabel,
      body: job.bodyLabel,
      cta: job.ctaLabel,
      hookText: job.hookTextContent,
      visualCta: job.visualCtaPhrase,
      variationSignature: job.variationSignature,
      sha256: job.sha256,
      visualFingerprint: job.visualFingerprint
    }))
  }

  const filePath = join(outputFolder, 'project-manifest.json')
  await writeFile(filePath, JSON.stringify(manifest, null, 2), 'utf-8')
  return filePath
}
