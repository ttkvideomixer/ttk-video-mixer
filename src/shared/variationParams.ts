import { balancedSequence, seededShuffle } from './rng'
import { NEUTRAL_VARIATION_PARAMETERS } from './defaults'
import type { CreativeVariationSettings, VariationParameters } from './types'

export const ZOOM_VALUES = [1.0, 1.02, 1.03, 1.05, 1.07, 1.1] as const
export const ROTATION_VALUES = [-1.0, -0.7, -0.4, 0, 0.4, 0.7, 1.0] as const
export const BRIGHTNESS_VALUES = [-0.025, -0.015, 0, 0.015, 0.025] as const
export const CONTRAST_VALUES = [0.96, 0.98, 1.0, 1.02, 1.04] as const
export const SATURATION_VALUES = [0.96, 0.98, 1.0, 1.02, 1.04] as const
export const SPEED_VALUES = [0.98, 0.99, 1.0, 1.01, 1.02, 1.03, 1.05] as const

/** Small, safe crop-region offsets as a fraction of the extra margin created by zooming in. */
const CROP_REGIONS: readonly { x: number; y: number }[] = [
  { x: 0, y: 0 }, // centro
  { x: -0.35, y: 0 }, // ligeiramente esquerda
  { x: 0.35, y: 0 }, // ligeiramente direita
  { x: 0, y: -0.35 }, // ligeiramente acima
  { x: 0, y: 0.35 } // ligeiramente abaixo
]

/**
 * How many distinct combinations of (enabled) parameters are available —
 * used to warn the user when they ask for more unique variations than the
 * math actually supports.
 */
export function countAvailableVariationSpace(settings: CreativeVariationSettings): number {
  if (!settings.enabled) return 1
  let space = 1
  if (settings.zoomEnabled) space *= ZOOM_VALUES.length
  if (settings.cropEnabled) space *= CROP_REGIONS.length
  if (settings.rotationEnabled) space *= ROTATION_VALUES.length
  if (settings.brightnessEnabled) space *= BRIGHTNESS_VALUES.length
  if (settings.contrastEnabled) space *= CONTRAST_VALUES.length
  if (settings.saturationEnabled) space *= SATURATION_VALUES.length
  if (settings.speedEnabled) space *= SPEED_VALUES.length
  if (settings.mirrorEnabled) space *= 2
  return space
}

/**
 * Builds `count` sets of variation parameters, one per job, balanced so no
 * single value dominates (e.g. not 900 videos at zoom 1.05), while keeping
 * every axis independently and deterministically derived from the seed so
 * reopening the project reproduces the same values (see project rule about
 * reproducible-but-pseudorandom variation).
 */
export function buildVariationSequence(
  settings: CreativeVariationSettings,
  count: number,
  seed: number
): VariationParameters[] {
  if (!settings.enabled || count <= 0) {
    return Array.from({ length: Math.max(0, count) }, () => ({ ...NEUTRAL_VARIATION_PARAMETERS }))
  }

  const zoomSeq = settings.zoomEnabled ? balancedSequence(ZOOM_VALUES, count, seed + 1) : null
  const cropSeq = settings.cropEnabled ? balancedSequence(CROP_REGIONS, count, seed + 2) : null
  const rotationSeq = settings.rotationEnabled ? balancedSequence(ROTATION_VALUES, count, seed + 3) : null
  const brightnessSeq = settings.brightnessEnabled ? balancedSequence(BRIGHTNESS_VALUES, count, seed + 4) : null
  const contrastSeq = settings.contrastEnabled ? balancedSequence(CONTRAST_VALUES, count, seed + 5) : null
  const saturationSeq = settings.saturationEnabled ? balancedSequence(SATURATION_VALUES, count, seed + 6) : null
  const speedSeq = settings.speedEnabled ? balancedSequence(SPEED_VALUES, count, seed + 7) : null
  const mirrorSeq = settings.mirrorEnabled ? buildMirrorSequence(count, seed + 8) : null

  return Array.from({ length: count }, (_, i) => ({
    zoom: zoomSeq ? zoomSeq[i] : NEUTRAL_VARIATION_PARAMETERS.zoom,
    cropX: cropSeq ? cropSeq[i].x : NEUTRAL_VARIATION_PARAMETERS.cropX,
    cropY: cropSeq ? cropSeq[i].y : NEUTRAL_VARIATION_PARAMETERS.cropY,
    rotation: rotationSeq ? rotationSeq[i] : NEUTRAL_VARIATION_PARAMETERS.rotation,
    brightness: brightnessSeq ? brightnessSeq[i] : NEUTRAL_VARIATION_PARAMETERS.brightness,
    contrast: contrastSeq ? contrastSeq[i] : NEUTRAL_VARIATION_PARAMETERS.contrast,
    saturation: saturationSeq ? saturationSeq[i] : NEUTRAL_VARIATION_PARAMETERS.saturation,
    speed: speedSeq ? speedSeq[i] : NEUTRAL_VARIATION_PARAMETERS.speed,
    mirror: mirrorSeq ? mirrorSeq[i] : NEUTRAL_VARIATION_PARAMETERS.mirror
  }))
}

/** Only "some" videos get mirrored (not all, not none) — roughly a balanced coin flip. */
function buildMirrorSequence(count: number, seed: number): boolean[] {
  const sequence = balancedSequence([false, true], count, seed)
  return seededShuffle(sequence, seed + 13)
}

/**
 * Derives one-off variation parameters for a duplicate-retry attempt: same
 * seed family as the batch, but nudged by the attempt number so it's
 * different from the original while staying deterministic and within the
 * same enabled-axes constraints.
 */
export function deriveRetryVariation(
  settings: CreativeVariationSettings,
  seed: number,
  attempt: number
): VariationParameters {
  return buildVariationSequence(settings, 1, seed + attempt * 7919 + 500000)[0]
}

export function buildVariationSignature(params: VariationParameters): string {
  const z = Math.round(params.zoom * 100)
  const x = Math.round(params.cropX * 100)
  const y = Math.round(params.cropY * 100)
  const r = Math.round(params.rotation * 10)
  const b = Math.round(params.brightness * 1000)
  const c = Math.round(params.contrast * 100)
  const s = Math.round(params.saturation * 100)
  const sp = Math.round(params.speed * 100)
  const m = params.mirror ? 1 : 0
  return `Z${z}-X${x}-Y${y}-R${r}-B${b}-C${c}-S${s}-SP${sp}-M${m}`
}
