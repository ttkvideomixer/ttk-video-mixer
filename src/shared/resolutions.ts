import type { ResolutionPreset } from './types'

export const RESOLUTION_MAP: Record<Exclude<ResolutionPreset, 'original'>, { width: number; height: number }> = {
  '1080x1920': { width: 1080, height: 1920 },
  '720x1280': { width: 720, height: 1280 },
  '1080x1350': { width: 1080, height: 1350 },
  '1080x1080': { width: 1080, height: 1080 },
  '1920x1080': { width: 1920, height: 1080 }
}

export const RESOLUTION_LABELS: Record<ResolutionPreset, string> = {
  original: 'Manter original',
  '1080x1920': '1080 × 1920 (recomendado)',
  '720x1280': '720 × 1280',
  '1080x1350': '1080 × 1350',
  '1080x1080': '1080 × 1080',
  '1920x1080': '1920 × 1080'
}
