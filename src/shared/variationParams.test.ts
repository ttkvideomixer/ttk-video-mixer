import { describe, expect, it } from 'vitest'
import {
  BRIGHTNESS_VALUES,
  CONTRAST_VALUES,
  ROTATION_VALUES,
  SATURATION_VALUES,
  SPEED_VALUES,
  ZOOM_VALUES,
  buildVariationSequence,
  buildVariationSignature,
  countAvailableVariationSpace
} from './variationParams'
import { DEFAULT_CREATIVE_VARIATION_SETTINGS, NEUTRAL_VARIATION_PARAMETERS } from './defaults'

describe('buildVariationSequence', () => {
  it('returns neutral parameters for everyone when disabled', () => {
    const result = buildVariationSequence({ ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: false }, 10, 1)
    for (const params of result) {
      expect(params).toEqual(NEUTRAL_VARIATION_PARAMETERS)
    }
  })

  it('keeps every axis within its documented value set when enabled', () => {
    const settings = { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: true, speedEnabled: true, mirrorEnabled: true }
    const result = buildVariationSequence(settings, 200, 42)
    for (const params of result) {
      expect(ZOOM_VALUES).toContain(params.zoom)
      expect(ROTATION_VALUES).toContain(params.rotation)
      expect(BRIGHTNESS_VALUES).toContain(params.brightness)
      expect(CONTRAST_VALUES).toContain(params.contrast)
      expect(SATURATION_VALUES).toContain(params.saturation)
      expect(SPEED_VALUES).toContain(params.speed)
      expect(typeof params.mirror).toBe('boolean')
    }
  })

  it('does not let a single zoom value dominate (balanced distribution)', () => {
    const settings = { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: true }
    const result = buildVariationSequence(settings, 600, 42)
    const counts = new Map<number, number>()
    for (const p of result) counts.set(p.zoom, (counts.get(p.zoom) ?? 0) + 1)
    for (const count of counts.values()) {
      expect(count).toBeLessThan(600 * 0.3)
    }
  })

  it('is reproducible for the same seed and different for a different seed', () => {
    const settings = { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: true }
    const a = buildVariationSequence(settings, 50, 100)
    const b = buildVariationSequence(settings, 50, 100)
    const c = buildVariationSequence(settings, 50, 200)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })
})

describe('buildVariationSignature', () => {
  it('produces the same signature for identical parameters', () => {
    const params = { ...NEUTRAL_VARIATION_PARAMETERS, zoom: 1.05, rotation: 0.4 }
    expect(buildVariationSignature(params)).toBe(buildVariationSignature({ ...params }))
  })

  it('produces different signatures for different parameters', () => {
    const a = buildVariationSignature({ ...NEUTRAL_VARIATION_PARAMETERS, zoom: 1.02 })
    const b = buildVariationSignature({ ...NEUTRAL_VARIATION_PARAMETERS, zoom: 1.05 })
    expect(a).not.toBe(b)
  })
})

describe('countAvailableVariationSpace', () => {
  it('is 1 when variation is disabled', () => {
    expect(countAvailableVariationSpace({ ...DEFAULT_CREATIVE_VARIATION_SETTINGS, enabled: false })).toBe(1)
  })

  it('multiplies the enabled axes only', () => {
    const settings = {
      enabled: true,
      zoomEnabled: true,
      cropEnabled: false,
      rotationEnabled: false,
      brightnessEnabled: false,
      contrastEnabled: false,
      saturationEnabled: false,
      speedEnabled: false,
      mirrorEnabled: false
    }
    expect(countAvailableVariationSpace(settings)).toBe(ZOOM_VALUES.length)
  })
})
