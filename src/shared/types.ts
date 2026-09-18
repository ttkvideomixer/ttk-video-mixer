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
  | '1080x1350'
  | '1080x1080'
  | '1920x1080'
  | '1440x1080'
  | '1080x1620'

export type FpsPreset = 'original' | '30' | '60'

export type FramingMode = 'contain' | 'cover'

/**
 * Curated subset of ffmpeg's native `xfade` transition styles — used both
 * for the main Gancho/Corpo/CTA joins (as 'crossfade-style') and for the
 * internal joins the Beat Cut feature creates between shuffled chunks.
 */
export type BeatTransitionStyle =
  | 'fade'
  | 'wipeleft'
  | 'wiperight'
  | 'slideup'
  | 'slidedown'
  | 'circleopen'
  | 'circleclose'
  | 'pixelize'
  | 'zoomin'
  | 'dissolve'
  | 'radial'

export type TransitionType = 'cut' | 'fade' | 'crossfade'

export type TransitionDuration = 0.1 | 0.2 | 0.3 | 0.5

export interface ExportSettings {
  resolution: ResolutionPreset
  fps: FpsPreset
  framing: FramingMode
  transition: TransitionType
  /** Which `xfade` visual style is used when transition === 'crossfade'. Ignored for 'cut'/'fade'. */
  crossfadeStyle: BeatTransitionStyle
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

/**
 * "Molduras" — decorative PNG frames (transparent center) bundled with the
 * app and overlaid on top of the full finished video, one per output,
 * randomly assigned. Only meaningful for the 9:16 vertical resolution
 * preset (1080x1920) — the frames are designed for that aspect ratio.
 */
export interface FrameSettings {
  enabled: boolean
}

/** A user-imported audio file available to attach to generated videos. */
export interface AudioFile {
  id: string
  name: string
  path: string
}

/**
 * Audio control for generation: muting the original audio of each category
 * independently, and/or attaching one or more of the user's own tracks —
 * either scoped to a single category (hook/body/cta) or spanning the whole
 * combined video (hook start to CTA end). Each pool with tracks in it gets
 * one randomly assigned per generated video (same distribute-without-repeat
 * mechanism as hook texts/CTA phrases/molduras); an empty pool means that
 * slot has nothing attached — there's no separate "enabled" flag to keep in
 * sync with the list.
 */
export interface AudioSettings {
  muteHook: boolean
  muteBody: boolean
  muteCta: boolean
  hookTracks: AudioFile[]
  bodyTracks: AudioFile[]
  ctaTracks: AudioFile[]
  fullTracks: AudioFile[]
}

/** Detected tempo of one audio file — a constant-tempo beat grid is `offsetSeconds + n*(60/bpm)`. */
export interface BeatGrid {
  bpm: number
  offsetSeconds: number
}

/**
 * "Beat Cut" — splits a segment's footage into chunks (beat-aligned when a
 * track is attached to that category, or evenly spaced otherwise), shuffles
 * their order, and joins them with a randomly-picked transition per cut —
 * a different unique remix per generated video. Independent per category,
 * same on/off + "apply to all" shortcut shape as AudioSettings' mute flags.
 */
export interface BeatCutSettings {
  hookEnabled: boolean
  bodyEnabled: boolean
  ctaEnabled: boolean
  /** Number of even chunks to use when the category has no attached track to derive a beat grid from. */
  fallbackChunkCount: number
  /** Transition styles eligible to be randomly picked for each internal cut. */
  allowedTransitionStyles: BeatTransitionStyle[]
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

/**
 * 'perSegment' (default): hookTexts overlay only during the hook, visualCta
 * only during the CTA — today's behavior. 'fullSpan': the SAME hookTexts
 * pool is instead burned in as ONE continuous overlay from the start of the
 * hook to the end of the CTA, and visualCta is ignored (mutually exclusive
 * "instead of", not additive).
 */
export type TextMode = 'perSegment' | 'fullSpan'

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
  /** Pre-rendered (Chromium canvas, not ffmpeg drawtext) transparent PNG at the target resolution — burning text in this way is what makes emoji render in full color instead of ffmpeg/freetype's monochrome-outline-only drawtext. Null when there's no hook text for this job. */
  hookTextImagePath: string | null
  /** Same mechanism as hookTextImagePath, for the CTA segment's auto-phrase overlay. */
  visualCtaImagePath: string | null
  framePath: string | null
  muteHook: boolean
  muteBody: boolean
  muteCta: boolean
  hookAudioPath: string | null
  bodyAudioPath: string | null
  ctaAudioPath: string | null
  fullAudioPath: string | null
  textMode: TextMode
  beatCutHook: boolean
  beatCutBody: boolean
  beatCutCta: boolean
  /** Seeds this job's chunk-shuffle + transition-style picks — unique per job so every generated video gets a different remix. */
  beatCutSeed: number
  beatCutFallbackChunkCount: number
  beatCutAllowedTransitions: BeatTransitionStyle[]
  /** Resolved from whichever track this job actually got assigned (hookAudioPath/etc) — null when that category has no track, or beat detection hasn't run for it. */
  hookBeatGrid: BeatGrid | null
  bodyBeatGrid: BeatGrid | null
  ctaBeatGrid: BeatGrid | null
  fullBeatGrid: BeatGrid | null
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
  frameSettings: FrameSettings
  audioSettings: AudioSettings
  beatCutSettings: BeatCutSettings
  textMode: TextMode
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
  hookTextImagePath: string | null
  visualCtaImagePath: string | null
  framePath: string | null
  muteHook: boolean
  muteBody: boolean
  muteCta: boolean
  hookAudioPath: string | null
  bodyAudioPath: string | null
  ctaAudioPath: string | null
  fullAudioPath: string | null
  textMode: TextMode
  beatCutHook: boolean
  beatCutBody: boolean
  beatCutCta: boolean
  beatCutSeed: number
  beatCutFallbackChunkCount: number
  beatCutAllowedTransitions: BeatTransitionStyle[]
  hookBeatGrid: BeatGrid | null
  bodyBeatGrid: BeatGrid | null
  ctaBeatGrid: BeatGrid | null
  fullBeatGrid: BeatGrid | null
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
  /** Folder the most recent successful generation (batch or single) wrote videos to — survives new projects and app restarts. */
  lastGeneratedFolder: string | null
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
