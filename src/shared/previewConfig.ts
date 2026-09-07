import { hashStringToSeed } from './rng'
import type {
  CreativeVariationSettings,
  ExportSettings,
  HookText,
  OverlayTransform,
  SilenceTrimSettings,
  VisualCtaSettings
} from './types'

export interface RenderAffectingConfig {
  exportSettings: Pick<ExportSettings, 'resolution' | 'fps' | 'framing' | 'transition' | 'transitionDuration' | 'crf' | 'audioBitrateKbps'>
  hookTexts: Pick<HookText, 'id' | 'text' | 'enabled'>[]
  visualCta: VisualCtaSettings
  creativeVariation: CreativeVariationSettings
  silenceTrim: SilenceTrimSettings
  hookTextOverlay: OverlayTransform
  visualCtaOverlay: OverlayTransform
}

/** JSON.stringify with object keys sorted at every level, so key order never affects the result. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort()
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * Deterministic fingerprint of every setting that changes how a video
 * actually renders. Used to invalidate an approved Preview the moment the
 * user changes something that would make the approved preview stale.
 */
export function computePreviewConfigurationHash(config: RenderAffectingConfig): string {
  return hashStringToSeed(stableStringify(config)).toString(16).padStart(8, '0')
}
