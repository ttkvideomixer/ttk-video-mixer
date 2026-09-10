import type { ResolutionPreset } from './types'

export const RESOLUTION_MAP: Record<Exclude<ResolutionPreset, 'original'>, { width: number; height: number }> = {
  '1080x1920': { width: 1080, height: 1920 },
  '1080x1350': { width: 1080, height: 1350 },
  '1080x1080': { width: 1080, height: 1080 },
  '1920x1080': { width: 1920, height: 1080 },
  '1440x1080': { width: 1440, height: 1080 },
  '1080x1620': { width: 1080, height: 1620 }
}

/** Proporção -> onde usar, na mesma ordem em que aparecem no seletor. */
export const RESOLUTION_LABELS: Record<ResolutionPreset, string> = {
  original: 'Manter original',
  '1080x1920': '9:16 — TikTok, Reels, Shorts, Stories',
  '1080x1350': '4:5 — Instagram Feed, Facebook Feed',
  '1080x1080': '1:1 — Instagram Feed, Facebook Feed',
  '1920x1080': '16:9 — YouTube, vídeos para computador/TV, sites',
  '1440x1080': '4:3 — Conteúdo tradicional/antigo, apresentações',
  '1080x1620': '2:3 — Pinterest e alguns conteúdos verticais específicos'
}
