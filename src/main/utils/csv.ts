import type { GenerationJob } from '@shared/types'

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'pendente',
  processing: 'processando',
  done: 'concluido',
  error: 'erro',
  skipped: 'pulado',
  canceled: 'cancelado'
}

/**
 * Extends the original CSV (numero..status) with the new tracking columns
 * from the creative-variation/text/dedup features, without removing or
 * reordering the original ones.
 */
export function buildCombinationsCsv(jobs: GenerationJob[]): string {
  const header = [
    'numero',
    'gancho',
    'corpo',
    'cta',
    'arquivo_saida',
    'status',
    'video_id',
    'hook_text',
    'visual_cta',
    'zoom',
    'crop_x',
    'crop_y',
    'rotation',
    'brightness',
    'contrast',
    'saturation',
    'speed',
    'mirror',
    'variation_signature',
    'sha256',
    'visual_fingerprint'
  ]

  const rows = jobs.map((job, i) =>
    [
      String(i + 1),
      job.hookLabel,
      job.bodyLabel,
      job.ctaLabel,
      job.outputFileName,
      STATUS_LABELS[job.status] ?? job.status,
      job.videoMixerId,
      job.hookTextContent ?? '',
      job.visualCtaPhrase ?? '',
      String(job.variation.zoom),
      String(job.variation.cropX),
      String(job.variation.cropY),
      String(job.variation.rotation),
      String(job.variation.brightness),
      String(job.variation.contrast),
      String(job.variation.saturation),
      String(job.variation.speed),
      job.variation.mirror ? 'sim' : 'nao',
      job.variationSignature,
      job.sha256 ?? '',
      job.visualFingerprint ?? ''
    ]
      .map(escapeCsvField)
      .join(',')
  )

  return [header.join(','), ...rows].join('\r\n')
}
