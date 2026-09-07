export type VideoCategory = 'hook' | 'body' | 'cta'

export interface VideoFile {
  id: string
  name: string
  path: string
  category: VideoCategory
  order: number
  duration: number | null
  width: number | null
  height: number | null
  fps: number | null
  hasAudio: boolean | null
  thumbnailDataUrl: string | null
  probeError: string | null
}

export type ResolutionPreset =
  | 'original'
  | '1080x1920'
  | '720x1280'
  | '1080x1350'
  | '1080x1080'
  | '1920x1080'

export type FpsPreset = 'original' | '30' | '60'

export type FramingMode = 'contain' | 'cover'

export type TransitionType = 'cut' | 'fade' | 'crossfade'

export type TransitionDuration = 0.1 | 0.2 | 0.3 | 0.5

export interface ExportSettings {
  resolution: ResolutionPreset
  fps: FpsPreset
  framing: FramingMode
  transition: TransitionType
  transitionDuration: TransitionDuration
  concurrency: 1 | 2 | 3 | 4
  overwriteExisting: boolean
  crf: number
  audioBitrateKbps: number
}

export interface CombinationSelectionSettings {
  mode: 'all' | 'limit'
  maxCombinations: number | null
  shuffle: boolean
  multiplyByHookText: boolean
}

export type JobStatus = 'pending' | 'processing' | 'done' | 'error' | 'skipped' | 'canceled'

export interface Combination {
  index: number
  hookIndex: number
  bodyIndex: number
  ctaIndex: number
}

/** A single user-authored hook caption line, shown as an overlay only during the hook segment. */
export interface HookText {
  id: string
  text: string
  order: number
  enabled: boolean
}

/** Position/scale of a text overlay, normalized (0..1) so it works at any output resolution. */
export interface OverlayTransform {
  xNormalized: number
  yNormalized: number
  scale: number
  maxWidthNormalized: number
}

export interface VisualCtaSettings {
  enabled: boolean
}

export interface CreativeVariationSettings {
  enabled: boolean
  zoomEnabled: boolean
  cropEnabled: boolean
  rotationEnabled: boolean
  brightnessEnabled: boolean
  contrastEnabled: boolean
  saturationEnabled: boolean
  speedEnabled: boolean
  mirrorEnabled: boolean
}

/** Resolved, concrete values applied to one specific generated video. */
export interface VariationParameters {
  zoom: number
  cropX: number
  cropY: number
  rotation: number
  brightness: number
  contrast: number
  saturation: number
  speed: number
  mirror: boolean
}

export interface SilenceTrimSettings {
  enabled: boolean
}

export interface SilenceTrimResult {
  trimStartMs: number
  trimEndMs: number
  sourceSize: number
  sourceMtimeMs: number
}

export interface PreviewOverlaysState {
  hookText: OverlayTransform
  visualCta: OverlayTransform
  showSafeZones: boolean
}

export interface PreviewState {
  approved: boolean
  configurationHash: string | null
}

export interface GenerationJob {
  id: string
  index: number
  hookId: string
  bodyId: string
  ctaId: string
  hookPath: string
  bodyPath: string
  ctaPath: string
  hookLabel: string
  bodyLabel: string
  ctaLabel: string
  outputFileName: string
  outputPath: string
  status: JobStatus
  error: string | null
  progress: number
  startedAt: number | null
  finishedAt: number | null
  videoMixerId: string
  hookTextId: string | null
  hookTextContent: string | null
  visualCtaPhrase: string | null
  variation: VariationParameters
  variationSignature: string
  sha256: string | null
  visualFingerprint: string | null
  attempt: number
}

export interface GenerationSummary {
  total: number
  completed: number
  errors: number
  skipped: number
  processing: number
  pending: number
}

export interface Project {
  schemaVersion: number
  id: string
  name: string
  hooks: VideoFile[]
  bodies: VideoFile[]
  ctas: VideoFile[]
  outputFolder: string | null
  createSubfolderPerProject: boolean
  prefix: string
  exportSettings: ExportSettings
  combinationSettings: CombinationSelectionSettings
  hookTexts: HookText[]
  visualCta: VisualCtaSettings
  creativeVariation: CreativeVariationSettings
  silenceTrim: SilenceTrimSettings
  overlays: PreviewOverlaysState
  projectSeed: number
  preview: PreviewState
  createdAt: number
  updatedAt: number
}

export interface ProjectSummary {
  id: string
  name: string
  updatedAt: number
  filePath: string
}

export interface FfmpegStatus {
  ready: boolean
  ffmpegPath: string | null
  ffprobePath: string | null
  message: string
}

export interface DiskSpaceInfo {
  freeBytes: number
  availableFormatted: string
}

/** Everything needed to render a single hook+body+cta combination into one final file. */
export interface RenderJobInput {
  hookPath: string
  bodyPath: string
  ctaPath: string
  settings: ExportSettings
  hookTextContent: string | null
  visualCtaPhrase: string | null
  variation: VariationParameters
  overlays: PreviewOverlaysState
  silenceTrimEnabled: boolean
}

export interface GenerationStartOptions {
  projectId: string
  projectName: string
  jobs: GenerationJob[]
  outputFolder: string
  exportSettings: ExportSettings
  overlays: PreviewOverlaysState
  silenceTrim: SilenceTrimSettings
  creativeVariation: CreativeVariationSettings
  projectSeed: number
  deviceId: string | null
}

export interface StartGenerationResult {
  authorized: boolean
  reason?: string
  allowedOutputs?: number
}

export interface LogEntry {
  id: string
  timestamp: number
  fileName: string
  status: JobStatus
  message: string
}

export interface RecentProjectEntry {
  id: string
  name: string
  filePath: string
  updatedAt: number
}

export interface PreferencesSchema {
  lastExportSettings: ExportSettings
  lastOutputFolder: string | null
  lastPrefix: string
  createSubfolderPerProject: boolean
  recentProjects: RecentProjectEntry[]
}

export interface ImportedVideoDescriptor {
  path: string
  name: string
  duration: number | null
  width: number | null
  height: number | null
  fps: number | null
  hasAudio: boolean | null
  thumbnailDataUrl: string | null
  probeError: string | null
}
