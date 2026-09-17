import { create } from 'zustand'
import { useAuthStore } from './useAuthStore'
import type {
  AudioFile,
  AudioSettings,
  CombinationSelectionSettings,
  CreativeVariationSettings,
  ExportSettings,
  FfmpegStatus,
  FrameSettings,
  GenerationJob,
  GenerationSummary,
  HookText,
  ImportedVideoDescriptor,
  LogEntry,
  OverlayTransform,
  PreviewOverlaysState,
  Project,
  RecentProjectEntry,
  SilenceTrimSettings,
  VariationParameters,
  VideoCategory,
  VideoFile,
  VisualCtaSettings
} from '@shared/types'
import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_COMBINATION_SETTINGS,
  DEFAULT_CREATIVE_VARIATION_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_FRAME_SETTINGS,
  DEFAULT_OVERLAYS_STATE,
  DEFAULT_PREFIX,
  DEFAULT_SILENCE_TRIM_SETTINGS,
  DEFAULT_VISUAL_CTA_SETTINGS,
  FRAME_ELIGIBLE_RESOLUTION,
  NEUTRAL_VARIATION_PARAMETERS,
  PROJECT_SCHEMA_VERSION
} from '@shared/defaults'
import { naturalSortBy } from '@shared/naturalSort'
import { buildGenerationJobs } from '@shared/jobBuilder'
import { joinWindowsPath } from '@shared/pathUtils'
import { sanitizeFileNamePart } from '@shared/sanitize'
import { computePreviewConfigurationHash, type RenderAffectingConfig } from '@shared/previewConfig'
import { buildVariationSequence } from '@shared/variationParams'
import { distributeCtaPhrases } from '@shared/ctaPhrases'

function toVideoFile(descriptor: ImportedVideoDescriptor, category: VideoCategory, order: number): VideoFile {
  return {
    id: `${category}-${crypto.randomUUID()}`,
    name: descriptor.name,
    path: descriptor.path,
    category,
    order,
    duration: descriptor.duration,
    width: descriptor.width,
    height: descriptor.height,
    fps: descriptor.fps,
    hasAudio: descriptor.hasAudio,
    thumbnailDataUrl: descriptor.thumbnailDataUrl,
    probeError: descriptor.probeError
  }
}

const AUDIO_SLOT_KEYS = {
  hook: 'hookTracks',
  body: 'bodyTracks',
  cta: 'ctaTracks',
  full: 'fullTracks'
} as const satisfies Record<AudioSlot, keyof AudioSettings>

function reindex(list: VideoFile[]): VideoFile[] {
  return list.map((item, i) => ({ ...item, order: i }))
}

function makeProjectSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

interface GenerationState {
  jobOrder: string[]
  jobsById: Record<string, GenerationJob>
  summary: GenerationSummary | null
  logs: LogEntry[]
  isRunning: boolean
  isPaused: boolean
  startedAt: number | null
  outputFolderUsed: string | null
}

const emptyGeneration: GenerationState = {
  jobOrder: [],
  jobsById: {},
  summary: null,
  logs: [],
  isRunning: false,
  isPaused: false,
  startedAt: null,
  outputFolderUsed: null
}

export type ModalName =
  | 'preview'
  | 'hookTexts'
  | 'confirmGenerate'
  | 'completion'
  | 'confirmClearCategory'
  | 'confirmCancel'
  | 'confirmNewSeed'
  | 'generationBusy'
  | 'missingRequirements'
  | 'paywall'
  | 'account'
  | 'audioFiles'
  | null

export type AudioSlot = 'hook' | 'body' | 'cta' | 'full'

interface AppState {
  ready: boolean
  ffmpegStatus: FfmpegStatus | null
  recentProjects: RecentProjectEntry[]

  projectId: string
  projectName: string
  hooks: VideoFile[]
  bodies: VideoFile[]
  ctas: VideoFile[]
  outputFolder: string | null
  /** Where the most recent generation actually wrote videos — survives "Novo Projeto" and app restarts, unlike generation.outputFolderUsed. */
  lastGeneratedFolder: string | null
  frameSettings: FrameSettings
  /** Bundled with the app (see main/utils/frameImport.ts) — loaded once at startup, same list for every project. */
  frameFilePaths: string[]
  audioSettings: AudioSettings
  /** Which slot the Áudio modal should show when opened — set by openAudioFilesModal. */
  audioModalSlot: AudioSlot
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
  previewApproved: boolean
  previewConfigurationHash: string | null

  activeModal: ModalName
  previewVideo: VideoFile | null
  clearCategoryTarget: VideoCategory | null
  paywallReason: string | null
  /**
   * Home and Progress are independent of whether a generation is running:
   * you can navigate to Home while a batch keeps rendering in the
   * background (see the "Ver Andamento" button) and back again — the
   * queue itself lives in the main process and doesn't care which screen
   * the renderer happens to be showing.
   */
  currentView: 'home' | 'progress'
  logPanelOpen: boolean
  testSelection: { hookId: string | null; bodyId: string | null; ctaId: string | null }
  testPreviewPath: string | null
  testPreviewLoading: boolean
  testPreviewError: string | null
  previewExampleVariation: VariationParameters
  previewExampleCtaPhrase: string | null

  generation: GenerationState

  initialize: () => Promise<void>
  importCategory: (category: VideoCategory) => Promise<void>
  importCategoryFolder: (category: VideoCategory) => Promise<void>
  addDroppedPaths: (category: VideoCategory, paths: string[]) => Promise<void>
  removeVideo: (category: VideoCategory, id: string) => void
  reorderVideos: (category: VideoCategory, fromIndex: number, toIndex: number) => void
  requestClearCategory: (category: VideoCategory) => void
  confirmClearCategory: () => void
  setOutputFolder: () => Promise<void>
  setFramesEnabled: (enabled: boolean) => void
  setMuteHook: (muted: boolean) => void
  setMuteBody: (muted: boolean) => void
  setMuteCta: (muted: boolean) => void
  muteAllAudio: () => void
  unmuteAllAudio: () => void
  openAudioFilesModal: (slot: AudioSlot) => void
  addAudioFiles: (slot: AudioSlot, files: AudioFile[]) => void
  removeAudioFile: (slot: AudioSlot, id: string) => void
  clearAudioSlot: (slot: AudioSlot) => void
  clearAllAttachedAudio: () => void
  setCreateSubfolderPerProject: (value: boolean) => void
  setPrefix: (value: string) => void
  setProjectName: (value: string) => void
  setExportSettings: (partial: Partial<ExportSettings>) => void
  setCombinationSettings: (partial: Partial<CombinationSelectionSettings>) => void

  openHookTextsModal: () => void
  addHookText: () => void
  addHookTexts: (texts: string[]) => void
  updateHookText: (id: string, text: string) => void
  removeHookText: (id: string) => void
  setVisualCtaEnabled: (enabled: boolean) => void
  setCreativeVariation: (partial: Partial<CreativeVariationSettings>) => void
  applySmoothVariationPreset: () => void
  setSilenceTrimEnabled: (enabled: boolean) => void
  requestNewSeed: () => void
  confirmNewSeed: () => void

  updateOverlay: (target: 'hookText' | 'visualCta', partial: Partial<OverlayTransform>) => void
  setShowSafeZones: (value: boolean) => void

  openPreview: (video: VideoFile) => void
  closePreview: () => void
  closeModal: () => void
  backToProject: () => void
  openAccount: () => void

  setTestSelection: (partial: Partial<AppState['testSelection']>) => void
  runTestPreview: () => Promise<void>
  approvePreview: () => void
  toggleLogPanel: () => void

  computeOutputFolderPath: () => string | null
  requestGenerate: () => void
  confirmGenerate: () => Promise<void>
  pauseGeneration: () => void
  resumeGeneration: () => void
  requestCancelGeneration: () => void
  confirmCancelGeneration: () => void
  goToHome: () => void
  goToProgress: () => void
  retryErrors: () => void
  exportCsv: () => Promise<void>

  newProject: () => void
  saveProject: () => Promise<void>
  loadProjectFromRecent: (filePath: string) => Promise<void>
}

// Deliberately attached to `window`, not a module-level variable: in dev
// mode, Vite HMR re-evaluates this module (and would reset a module-level
// variable back to null) without a full page reload, which would leave the
// PREVIOUS registration's ipcRenderer listeners attached forever — each
// hot-reload after that would then react to every real generation event
// with an extra, stale duplicate. `window` survives HMR, so we can always
// find and tear down the prior registration first.
declare global {
  interface Window {
    __vmUnsubscribeGenerationEvents?: () => void
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  ffmpegStatus: null,
  recentProjects: [],

  projectId: '',
  projectName: 'Novo Projeto',
  hooks: [],
  bodies: [],
  ctas: [],
  outputFolder: null,
  lastGeneratedFolder: null,
  frameSettings: DEFAULT_FRAME_SETTINGS,
  frameFilePaths: [],
  audioSettings: DEFAULT_AUDIO_SETTINGS,
  audioModalSlot: 'hook',
  createSubfolderPerProject: true,
  prefix: DEFAULT_PREFIX,
  exportSettings: DEFAULT_EXPORT_SETTINGS,
  combinationSettings: DEFAULT_COMBINATION_SETTINGS,

  hookTexts: [],
  visualCta: DEFAULT_VISUAL_CTA_SETTINGS,
  creativeVariation: DEFAULT_CREATIVE_VARIATION_SETTINGS,
  silenceTrim: DEFAULT_SILENCE_TRIM_SETTINGS,
  overlays: DEFAULT_OVERLAYS_STATE,
  projectSeed: makeProjectSeed(),
  previewApproved: false,
  previewConfigurationHash: null,

  activeModal: null,
  previewVideo: null,
  clearCategoryTarget: null,
  paywallReason: null,
  currentView: 'home',
  logPanelOpen: false,
  testSelection: { hookId: null, bodyId: null, ctaId: null },
  testPreviewPath: null,
  testPreviewLoading: false,
  testPreviewError: null,
  previewExampleVariation: NEUTRAL_VARIATION_PARAMETERS,
  previewExampleCtaPhrase: null,

  generation: emptyGeneration,

  initialize: async () => {
    const [ffmpegStatus, preferences, recentProjects, projectId] = await Promise.all([
      window.api.ffmpegStatus(),
      window.api.getPreferences(),
      window.api.listRecentProjects(),
      window.api.newProjectId()
    ])

    set({
      ready: true,
      ffmpegStatus,
      recentProjects,
      projectId,
      exportSettings: preferences.lastExportSettings,
      outputFolder: preferences.lastOutputFolder,
      lastGeneratedFolder: preferences.lastGeneratedFolder,
      prefix: preferences.lastPrefix,
      createSubfolderPerProject: preferences.createSubfolderPerProject
    })

    window.api.listBundledFrames().then((filePaths) => set({ frameFilePaths: filePaths }))

    window.__vmUnsubscribeGenerationEvents?.()

    const offJob = window.api.onJobUpdated((job) => {
      set((state) => ({
        generation: {
          ...state.generation,
          jobsById: { ...state.generation.jobsById, [job.id]: job }
        }
      }))
    })
    const offSummary = window.api.onGenerationSummary((summary) => {
      set((state) => ({ generation: { ...state.generation, summary } }))
    })
    const offLog = window.api.onLogEntry((entry) => {
      set((state) => ({
        generation: { ...state.generation, logs: [entry, ...state.generation.logs].slice(0, 500) }
      }))
    })
    const offFinished = window.api.onGenerationFinished((summary) => {
      set((state) => ({
        generation: { ...state.generation, summary, isRunning: false, isPaused: false },
        activeModal: 'completion'
      }))
    })
    window.__vmUnsubscribeGenerationEvents = () => {
      offJob()
      offSummary()
      offLog()
      offFinished()
    }
  },

  importCategory: async (category) => {
    const descriptors = await window.api.importVideos()
    if (descriptors.length === 0) return
    applyImportedDescriptors(set, get, category, descriptors)
  },

  importCategoryFolder: async (category) => {
    const descriptors = await window.api.importFolder()
    if (descriptors.length === 0) return
    applyImportedDescriptors(set, get, category, descriptors)
  },

  addDroppedPaths: async (category, paths) => {
    if (paths.length === 0) return
    const descriptors = await window.api.describePaths(paths)
    if (descriptors.length === 0) return
    applyImportedDescriptors(set, get, category, descriptors)
  },

  removeVideo: (category, id) => {
    const key = categoryKey(category)
    set((state) => ({ [key]: reindex(state[key].filter((v) => v.id !== id)), previewApproved: false }) as never)
  },

  reorderVideos: (category, fromIndex, toIndex) => {
    const key = categoryKey(category)
    set((state) => {
      const list = [...state[key]]
      const [moved] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, moved)
      return { [key]: reindex(list) } as never
    })
  },

  requestClearCategory: (category) => set({ clearCategoryTarget: category, activeModal: 'confirmClearCategory' }),

  confirmClearCategory: () => {
    const target = get().clearCategoryTarget
    if (target) {
      const key = categoryKey(target)
      set({ [key]: [], previewApproved: false } as never)
    }
    set({ activeModal: null, clearCategoryTarget: null })
  },

  setOutputFolder: async () => {
    const folder = await window.api.chooseOutputFolder()
    if (folder) {
      set({ outputFolder: folder })
      window.api.setPreferences({ lastOutputFolder: folder })
    }
  },

  setFramesEnabled: (enabled) => {
    set((state) => ({ frameSettings: { ...state.frameSettings, enabled } }))
  },

  setMuteHook: (muted) => {
    set((state) => ({ audioSettings: { ...state.audioSettings, muteHook: muted }, previewApproved: false }))
  },
  setMuteBody: (muted) => {
    set((state) => ({ audioSettings: { ...state.audioSettings, muteBody: muted }, previewApproved: false }))
  },
  setMuteCta: (muted) => {
    set((state) => ({ audioSettings: { ...state.audioSettings, muteCta: muted }, previewApproved: false }))
  },
  muteAllAudio: () => {
    set((state) => ({
      audioSettings: { ...state.audioSettings, muteHook: true, muteBody: true, muteCta: true },
      previewApproved: false
    }))
  },
  unmuteAllAudio: () => {
    set((state) => ({
      audioSettings: { ...state.audioSettings, muteHook: false, muteBody: false, muteCta: false },
      previewApproved: false
    }))
  },

  openAudioFilesModal: (slot) => set({ activeModal: 'audioFiles', audioModalSlot: slot }),

  addAudioFiles: (slot, files) => {
    if (files.length === 0) return
    const key = AUDIO_SLOT_KEYS[slot]
    set((state) => ({
      audioSettings: { ...state.audioSettings, [key]: [...state.audioSettings[key], ...files] },
      previewApproved: false
    }))
  },

  removeAudioFile: (slot, id) => {
    const key = AUDIO_SLOT_KEYS[slot]
    set((state) => ({
      audioSettings: { ...state.audioSettings, [key]: state.audioSettings[key].filter((f) => f.id !== id) },
      previewApproved: false
    }))
  },

  clearAudioSlot: (slot) => {
    const key = AUDIO_SLOT_KEYS[slot]
    set((state) => ({ audioSettings: { ...state.audioSettings, [key]: [] }, previewApproved: false }))
  },

  clearAllAttachedAudio: () => {
    set((state) => ({
      audioSettings: { ...state.audioSettings, hookTracks: [], bodyTracks: [], ctaTracks: [], fullTracks: [] },
      previewApproved: false
    }))
  },

  setCreateSubfolderPerProject: (value) => {
    set({ createSubfolderPerProject: value })
    window.api.setPreferences({ createSubfolderPerProject: value })
  },

  setPrefix: (value) => {
    set({ prefix: value })
    window.api.setPreferences({ lastPrefix: value })
  },

  setProjectName: (value) => set({ projectName: value }),

  setExportSettings: (partial) => {
    set((state) => {
      const next = { ...state.exportSettings, ...partial }
      window.api.setPreferences({ lastExportSettings: next })
      return { exportSettings: next, previewApproved: false }
    })
  },

  setCombinationSettings: (partial) =>
    set((state) => ({ combinationSettings: { ...state.combinationSettings, ...partial } })),

  openHookTextsModal: () => set({ activeModal: 'hookTexts' }),

  addHookText: () =>
    set((state) => ({
      hookTexts: [
        ...state.hookTexts,
        { id: `ht-${crypto.randomUUID()}`, text: '', order: state.hookTexts.length, enabled: true }
      ],
      previewApproved: false
    })),

  // One line pasted -> one hook text, so someone can paste a whole list of
  // ideas at once instead of clicking "+ Adicionar Texto" per line.
  addHookTexts: (texts) =>
    set((state) => {
      const cleaned = texts.map((t) => t.trim().slice(0, 90)).filter((t) => t.length > 0)
      if (cleaned.length === 0) return {}
      const startOrder = state.hookTexts.length
      return {
        hookTexts: [
          ...state.hookTexts,
          ...cleaned.map((text, i) => ({
            id: `ht-${crypto.randomUUID()}`,
            text,
            order: startOrder + i,
            enabled: true
          }))
        ],
        previewApproved: false
      }
    }),

  updateHookText: (id, text) =>
    set((state) => ({
      hookTexts: state.hookTexts.map((t) => (t.id === id ? { ...t, text: text.slice(0, 90) } : t)),
      previewApproved: false
    })),

  removeHookText: (id) =>
    set((state) => ({
      hookTexts: state.hookTexts.filter((t) => t.id !== id),
      previewApproved: false
    })),

  setVisualCtaEnabled: (enabled) => set({ visualCta: { enabled }, previewApproved: false }),

  setCreativeVariation: (partial) =>
    set((state) => ({ creativeVariation: { ...state.creativeVariation, ...partial }, previewApproved: false })),

  applySmoothVariationPreset: () =>
    set({
      creativeVariation: {
        enabled: true,
        zoomEnabled: true,
        cropEnabled: true,
        rotationEnabled: true,
        brightnessEnabled: true,
        contrastEnabled: true,
        saturationEnabled: true,
        speedEnabled: false,
        mirrorEnabled: false
      },
      previewApproved: false
    }),

  setSilenceTrimEnabled: (enabled) =>
    set((state) => ({ silenceTrim: { ...state.silenceTrim, enabled }, previewApproved: false })),

  requestNewSeed: () => set({ activeModal: 'confirmNewSeed' }),

  confirmNewSeed: () => {
    // Only meaningful before generation has produced any jobs yet — once a
    // batch is built and handed to the (main-process) queue, its jobs are
    // independent copies, so re-rolling here only ever affects the next
    // Previsualizar/Gerar Vídeos run, never something already in flight.
    set({ projectSeed: makeProjectSeed(), activeModal: null, previewApproved: false })
  },

  updateOverlay: (target, partial) =>
    set((state) => ({
      overlays: { ...state.overlays, [target]: { ...state.overlays[target], ...partial } }
    })),

  setShowSafeZones: (value) => set((state) => ({ overlays: { ...state.overlays, showSafeZones: value } })),

  openPreview: (video) => set({ previewVideo: video, activeModal: 'preview' }),
  closePreview: () => set({ previewVideo: null, activeModal: null }),
  closeModal: () => set({ activeModal: null }),
  openAccount: () => set({ activeModal: 'account' }),
  backToProject: () => set({ activeModal: null, generation: emptyGeneration, currentView: 'home' }),

  setTestSelection: (partial) => set((state) => ({ testSelection: { ...state.testSelection, ...partial } })),

  runTestPreview: async () => {
    if (isGenerationActive(get().generation)) {
      set({ activeModal: 'generationBusy' })
      return
    }
    const {
      hooks,
      bodies,
      ctas,
      testSelection,
      exportSettings,
      overlays,
      silenceTrim,
      visualCta,
      frameSettings,
      frameFilePaths,
      audioSettings
    } = get()
    const hook = hooks.find((h) => h.id === testSelection.hookId) ?? hooks[0]
    const body = bodies.find((b) => b.id === testSelection.bodyId) ?? bodies[0]
    const cta = ctas.find((c) => c.id === testSelection.ctaId) ?? ctas[0]
    if (!hook || !body || !cta) {
      set({ testPreviewError: 'Selecione um gancho, um corpo e um CTA para visualizar.' })
      return
    }
    // Rolling a fresh variation here (instead of a separate "Nova Variação"
    // button) means every preview click shows a genuinely different
    // creative variation, not the same one repeated.
    const { creativeVariation } = get()
    const rolledVariation = buildVariationSequence(
      creativeVariation,
      1,
      Date.now() + Math.floor(Math.random() * 1e6)
    )[0]
    set({ testPreviewLoading: true, testPreviewError: null, testPreviewPath: null, previewExampleVariation: rolledVariation })
    try {
      const ctaPhrase = visualCta.enabled ? distributeCtaPhrases(1, Date.now())[0] : null
      const framesEligible = frameSettings.enabled && exportSettings.resolution === FRAME_ELIGIBLE_RESOLUTION
      const framePath =
        framesEligible && frameFilePaths.length > 0
          ? frameFilePaths[Math.floor(Math.random() * frameFilePaths.length)]
          : null
      const pickRandomTrack = (files: { path: string }[]): string | null =>
        files.length > 0 ? files[Math.floor(Math.random() * files.length)].path : null
      const hookAudioPath = pickRandomTrack(audioSettings.hookTracks)
      const bodyAudioPath = pickRandomTrack(audioSettings.bodyTracks)
      const ctaAudioPath = pickRandomTrack(audioSettings.ctaTracks)
      const fullAudioPath = pickRandomTrack(audioSettings.fullTracks)
      // The underlying clip is rendered WITHOUT burning the text in: the
      // Preview screen draws the hook/CTA text itself as a live, draggable
      // HTML overlay (using the exact same font/size/wrap math as ffmpeg),
      // so the user edits directly on top of the raw footage instead of
      // seeing two overlapping copies of the same phrase.
      const path = await window.api.previewCombination({
        hookPath: hook.path,
        bodyPath: body.path,
        ctaPath: cta.path,
        settings: exportSettings,
        overlays,
        silenceTrimEnabled: silenceTrim.enabled,
        hookTextContent: null,
        visualCtaPhrase: null,
        framePath,
        muteHook: audioSettings.muteHook,
        muteBody: audioSettings.muteBody,
        muteCta: audioSettings.muteCta,
        hookAudioPath,
        bodyAudioPath,
        ctaAudioPath,
        fullAudioPath,
        variation: rolledVariation
      })
      set({ testPreviewPath: path, testPreviewLoading: false, previewExampleCtaPhrase: ctaPhrase })
    } catch (error) {
      set({
        testPreviewError: error instanceof Error ? error.message : 'Falha ao gerar previa.',
        testPreviewLoading: false
      })
    }
  },

  approvePreview: () => {
    const hash = computePreviewConfigurationHash(buildRenderAffectingConfig(get()))
    set({ previewApproved: true, previewConfigurationHash: hash })
  },

  toggleLogPanel: () => set((state) => ({ logPanelOpen: !state.logPanelOpen })),

  computeOutputFolderPath: () => {
    const { outputFolder, createSubfolderPerProject, projectName } = get()
    if (!outputFolder) return null
    if (createSubfolderPerProject) {
      return joinWindowsPath(outputFolder, sanitizeFolderName(projectName), 'videos-gerados')
    }
    return joinWindowsPath(outputFolder, 'videos-gerados')
  },

  requestGenerate: () => {
    const state = get()
    if (isGenerationActive(state.generation)) {
      set({ activeModal: 'generationBusy' })
      return
    }
    if (getMissingGenerateRequirements(state).length > 0) {
      set({ activeModal: 'missingRequirements' })
      return
    }
    set({ activeModal: 'confirmGenerate' })
  },

  confirmGenerate: async () => {
    const state = get()
    if (isGenerationActive(state.generation)) {
      set({ activeModal: 'generationBusy' })
      return
    }
    const {
      hooks,
      bodies,
      ctas,
      prefix,
      combinationSettings,
      exportSettings,
      hookTexts,
      visualCta,
      creativeVariation,
      projectSeed,
      frameSettings,
      audioSettings
    } = state
    const outputFolder = get().computeOutputFolderPath()
    if (!outputFolder) return

    const currentHash = computePreviewConfigurationHash(buildRenderAffectingConfig(state))
    if (!state.previewApproved || currentHash !== state.previewConfigurationHash) {
      set({ previewApproved: false, activeModal: null })
      return
    }

    const framesEligible = frameSettings.enabled && exportSettings.resolution === FRAME_ELIGIBLE_RESOLUTION
    const frameFilePaths = framesEligible ? await window.api.listBundledFrames() : []

    const jobs = buildGenerationJobs({
      hooks,
      bodies,
      ctas,
      prefix,
      outputFolder,
      combinationSettings,
      hookTexts,
      visualCtaEnabled: visualCta.enabled,
      creativeVariation,
      projectSeed,
      frameFilePaths,
      audioSettings
    })

    set({ activeModal: null })

    // The server decides — see project rule "toda vez que clicar em Gerar
    // Vídeos, fazer requisição ao servidor." The main process only starts
    // GenerationQueue after this call authorizes it.
    const deviceId = useAuthStore.getState().deviceId
    const result = await window.api.startGeneration({
      projectId: state.projectId,
      projectName: state.projectName,
      jobs,
      outputFolder,
      exportSettings,
      overlays: state.overlays,
      silenceTrim: state.silenceTrim,
      creativeVariation,
      projectSeed,
      deviceId
    })

    if (!result.authorized) {
      set({ activeModal: 'paywall', paywallReason: result.reason ?? 'SUBSCRIPTION_REQUIRED' })
      useAuthStore.getState().refreshEntitlement()
      return
    }

    const allowedOutputs = result.allowedOutputs ?? jobs.length
    const trackedJobs = allowedOutputs < jobs.length ? jobs.slice(0, allowedOutputs) : jobs

    const jobsById: Record<string, GenerationJob> = {}
    const jobOrder: string[] = []
    for (const job of trackedJobs) {
      jobsById[job.id] = job
      jobOrder.push(job.id)
    }

    set({
      currentView: 'progress',
      lastGeneratedFolder: outputFolder,
      generation: {
        jobOrder,
        jobsById,
        summary: { total: trackedJobs.length, completed: 0, errors: 0, skipped: 0, processing: 0, pending: trackedJobs.length },
        logs: [],
        isRunning: true,
        isPaused: false,
        startedAt: Date.now(),
        outputFolderUsed: outputFolder
      }
    })
    window.api.setPreferences({ lastGeneratedFolder: outputFolder })

    useAuthStore.getState().refreshEntitlement()
  },

  pauseGeneration: () => {
    window.api.pauseGeneration()
    set((state) => ({ generation: { ...state.generation, isPaused: true } }))
  },

  resumeGeneration: () => {
    window.api.resumeGeneration()
    set((state) => ({ generation: { ...state.generation, isPaused: false } }))
  },

  requestCancelGeneration: () => set({ activeModal: 'confirmCancel' }),

  confirmCancelGeneration: () => {
    window.api.cancelGeneration()
    set((state) => ({
      activeModal: null,
      generation: { ...state.generation, isRunning: false, isPaused: false }
    }))
  },

  goToHome: () => set({ currentView: 'home' }),
  goToProgress: () => set({ currentView: 'progress' }),

  retryErrors: () => {
    window.api.retryErrors()
    set((state) => ({ generation: { ...state.generation, isRunning: true } }))
  },

  exportCsv: async () => {
    const { generation } = get()
    const jobs = generation.jobOrder.map((id) => generation.jobsById[id])
    if (jobs.length === 0) return
    await window.api.exportCombinationsCsv(jobs)
  },

  newProject: async () => {
    if (isGenerationActive(get().generation)) {
      set({ activeModal: 'generationBusy' })
      return
    }
    const projectId = await window.api.newProjectId()
    set({
      projectId,
      projectName: 'Novo Projeto',
      hooks: [],
      bodies: [],
      ctas: [],
      combinationSettings: DEFAULT_COMBINATION_SETTINGS,
      hookTexts: [],
      visualCta: DEFAULT_VISUAL_CTA_SETTINGS,
      creativeVariation: DEFAULT_CREATIVE_VARIATION_SETTINGS,
      silenceTrim: DEFAULT_SILENCE_TRIM_SETTINGS,
      audioSettings: DEFAULT_AUDIO_SETTINGS,
      overlays: DEFAULT_OVERLAYS_STATE,
      projectSeed: makeProjectSeed(),
      previewApproved: false,
      previewConfigurationHash: null,
      generation: emptyGeneration,
      currentView: 'home',
      activeModal: null
    })
  },

  saveProject: async () => {
    const state = get()
    const project: Project = {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: state.projectId,
      name: state.projectName,
      hooks: state.hooks,
      bodies: state.bodies,
      ctas: state.ctas,
      outputFolder: state.outputFolder,
      createSubfolderPerProject: state.createSubfolderPerProject,
      prefix: state.prefix,
      exportSettings: state.exportSettings,
      combinationSettings: state.combinationSettings,
      hookTexts: state.hookTexts,
      visualCta: state.visualCta,
      creativeVariation: state.creativeVariation,
      silenceTrim: state.silenceTrim,
      overlays: state.overlays,
      projectSeed: state.projectSeed,
      preview: { approved: state.previewApproved, configurationHash: state.previewConfigurationHash },
      frameSettings: state.frameSettings,
      audioSettings: state.audioSettings,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await window.api.saveProject(project)
    const recentProjects = await window.api.listRecentProjects()
    set({ recentProjects })
  },

  loadProjectFromRecent: async (filePath) => {
    if (isGenerationActive(get().generation)) {
      set({ activeModal: 'generationBusy' })
      return
    }
    const project = await window.api.loadProject(filePath)
    set({
      projectId: project.id,
      projectName: project.name,
      hooks: project.hooks,
      bodies: project.bodies,
      ctas: project.ctas,
      outputFolder: project.outputFolder,
      createSubfolderPerProject: project.createSubfolderPerProject,
      prefix: project.prefix,
      exportSettings: project.exportSettings,
      combinationSettings: project.combinationSettings,
      hookTexts: project.hookTexts,
      visualCta: project.visualCta,
      creativeVariation: project.creativeVariation,
      silenceTrim: project.silenceTrim,
      overlays: project.overlays,
      projectSeed: project.projectSeed,
      previewApproved: project.preview.approved,
      previewConfigurationHash: project.preview.configurationHash,
      frameSettings: project.frameSettings,
      audioSettings: project.audioSettings,
      generation: emptyGeneration,
      currentView: 'home',
      activeModal: null
    })
  }
}))

function isGenerationActive(generation: GenerationState): boolean {
  if (generation.isRunning) return true
  const summary = generation.summary
  return !!summary && (summary.processing > 0 || summary.pending > 0)
}

/**
 * Single source of truth for "why can't I generate yet" — used both to
 * decide whether clicking Gerar Vídeos opens the confirm modal or the
 * missing-requirements explainer, and to render that explainer's list.
 */
export function getMissingGenerateRequirements(
  state: Pick<AppState, 'hooks' | 'bodies' | 'ctas' | 'outputFolder' | 'previewApproved'>
): string[] {
  const missing: string[] = []
  if (state.hooks.length === 0) missing.push('Adicione pelo menos um vídeo de Gancho.')
  if (state.bodies.length === 0) missing.push('Adicione pelo menos um vídeo de Corpo.')
  if (state.ctas.length === 0) missing.push('Adicione pelo menos um vídeo de CTA.')
  if (!state.outputFolder) missing.push('Escolha uma pasta para salvar os vídeos.')
  if (missing.length === 0 && !state.previewApproved) {
    missing.push('Aperte em "Visualizar Combinação" no Preview e aprove o modelo antes de gerar os vídeos.')
  }
  return missing
}

function categoryKey(category: VideoCategory): 'hooks' | 'bodies' | 'ctas' {
  if (category === 'hook') return 'hooks'
  if (category === 'body') return 'bodies'
  return 'ctas'
}

function buildRenderAffectingConfig(state: AppState): RenderAffectingConfig {
  return {
    exportSettings: {
      resolution: state.exportSettings.resolution,
      fps: state.exportSettings.fps,
      framing: state.exportSettings.framing,
      transition: state.exportSettings.transition,
      transitionDuration: state.exportSettings.transitionDuration,
      crf: state.exportSettings.crf,
      audioBitrateKbps: state.exportSettings.audioBitrateKbps
    },
    hookTexts: state.hookTexts.map((t) => ({ id: t.id, text: t.text, enabled: t.enabled })),
    visualCta: state.visualCta,
    creativeVariation: state.creativeVariation,
    silenceTrim: state.silenceTrim,
    hookTextOverlay: state.overlays.hookText,
    visualCtaOverlay: state.overlays.visualCta
  }
}

function applyImportedDescriptors(
  set: (fn: (state: AppState) => Partial<AppState>) => void,
  get: () => AppState,
  category: VideoCategory,
  descriptors: ImportedVideoDescriptor[]
): void {
  const key = categoryKey(category)
  const existingPaths = new Set(get()[key].map((v) => v.path))
  const newOnes = descriptors.filter((d) => !existingPaths.has(d.path))
  if (newOnes.length === 0) return

  set((state) => {
    const combined = [...state[key], ...newOnes.map((d, i) => toVideoFile(d, category, state[key].length + i))]
    const sorted = naturalSortBy(combined, (v) => v.name)
    return { [key]: reindex(sorted), previewApproved: false } as Partial<AppState>
  })
}

function sanitizeFolderName(name: string): string {
  return sanitizeFileNamePart(name, 'Projeto')
}
