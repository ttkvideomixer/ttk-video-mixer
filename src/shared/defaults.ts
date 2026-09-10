import type {
  CombinationSelectionSettings,
  CreativeVariationSettings,
  ExportSettings,
  FrameSettings,
  PreviewOverlaysState,
  PreviewState,
  SilenceTrimSettings,
  VariationParameters,
  VisualCtaSettings
} from './types'

export const PROJECT_SCHEMA_VERSION = 2

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: '1080x1920',
  fps: '30',
  framing: 'contain',
  transition: 'cut',
  transitionDuration: 0.2,
  concurrency: 2,
  overwriteExisting: false,
  crf: 19,
  audioBitrateKbps: 192
}

export const DEFAULT_COMBINATION_SETTINGS: CombinationSelectionSettings = {
  mode: 'all',
  maxCombinations: null,
  shuffle: false,
  multiplyByHookText: false
}

export const DEFAULT_VISUAL_CTA_SETTINGS: VisualCtaSettings = {
  enabled: false
}

export const DEFAULT_CREATIVE_VARIATION_SETTINGS: CreativeVariationSettings = {
  enabled: false,
  zoomEnabled: true,
  cropEnabled: true,
  rotationEnabled: true,
  brightnessEnabled: true,
  contrastEnabled: true,
  saturationEnabled: true,
  speedEnabled: false,
  mirrorEnabled: false
}

export const DEFAULT_SILENCE_TRIM_SETTINGS: SilenceTrimSettings = {
  enabled: false
}

export const NEUTRAL_VARIATION_PARAMETERS: VariationParameters = {
  zoom: 1,
  cropX: 0,
  cropY: 0,
  rotation: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  speed: 1,
  mirror: false
}

export const DEFAULT_HOOK_TEXT_OVERLAY = {
  xNormalized: 0.5,
  yNormalized: 0.18,
  scale: 1,
  maxWidthNormalized: 0.82
}

export const DEFAULT_VISUAL_CTA_OVERLAY = {
  xNormalized: 0.5,
  yNormalized: 0.78,
  scale: 1,
  maxWidthNormalized: 0.7
}

export const DEFAULT_OVERLAYS_STATE: PreviewOverlaysState = {
  hookText: DEFAULT_HOOK_TEXT_OVERLAY,
  visualCta: DEFAULT_VISUAL_CTA_OVERLAY,
  showSafeZones: true
}

export const DEFAULT_PREVIEW_STATE: PreviewState = {
  approved: false,
  configurationHash: null
}

export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
  enabled: false,
  folderPath: null
}

export const MAX_VARIATION_RETRY_ATTEMPTS = 5

export const DEFAULT_PREFIX = 'video'

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm', '.m4v', '.avi']
export const SUPPORTED_FRAME_EXTENSIONS = ['.png']
/** Only this resolution preset matches what the "molduras" PNGs are designed for. */
export const FRAME_ELIGIBLE_RESOLUTION = '1080x1920'

export const LARGE_PROJECT_WARNING_THRESHOLD = 500
export const VERY_LARGE_PROJECT_WARNING_THRESHOLD = 2000
