import { describe, expect, it } from 'vitest'
import { computePreviewConfigurationHash, type RenderAffectingConfig } from './previewConfig'
import { DEFAULT_CREATIVE_VARIATION_SETTINGS, DEFAULT_EXPORT_SETTINGS, DEFAULT_OVERLAYS_STATE, DEFAULT_SILENCE_TRIM_SETTINGS, DEFAULT_VISUAL_CTA_SETTINGS } from './defaults'

function baseConfig(): RenderAffectingConfig {
  return {
    exportSettings: DEFAULT_EXPORT_SETTINGS,
    hookTexts: [{ id: 'h1', text: 'Olha isso', enabled: true }],
    visualCta: DEFAULT_VISUAL_CTA_SETTINGS,
    creativeVariation: DEFAULT_CREATIVE_VARIATION_SETTINGS,
    silenceTrim: DEFAULT_SILENCE_TRIM_SETTINGS,
    hookTextOverlay: DEFAULT_OVERLAYS_STATE.hookText,
    visualCtaOverlay: DEFAULT_OVERLAYS_STATE.visualCta
  }
}

describe('computePreviewConfigurationHash', () => {
  it('is stable for the same configuration', () => {
    expect(computePreviewConfigurationHash(baseConfig())).toBe(computePreviewConfigurationHash(baseConfig()))
  })

  it('changes when a hook text changes', () => {
    const a = computePreviewConfigurationHash(baseConfig())
    const config = baseConfig()
    config.hookTexts = [{ id: 'h1', text: 'Outro texto', enabled: true }]
    expect(computePreviewConfigurationHash(config)).not.toBe(a)
  })

  it('changes when the overlay position changes', () => {
    const a = computePreviewConfigurationHash(baseConfig())
    const config = baseConfig()
    config.hookTextOverlay = { ...config.hookTextOverlay, xNormalized: 0.3 }
    expect(computePreviewConfigurationHash(config)).not.toBe(a)
  })

  it('is not affected by key order', () => {
    const config = baseConfig()
    const reordered = {
      visualCta: config.visualCta,
      exportSettings: config.exportSettings,
      silenceTrim: config.silenceTrim,
      hookTexts: config.hookTexts,
      creativeVariation: config.creativeVariation,
      hookTextOverlay: config.hookTextOverlay,
      visualCtaOverlay: config.visualCtaOverlay
    }
    expect(computePreviewConfigurationHash(config)).toBe(computePreviewConfigurationHash(reordered))
  })
})
