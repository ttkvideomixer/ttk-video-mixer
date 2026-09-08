import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import type {
  DiskSpaceInfo,
  FfmpegStatus,
  GenerationJob,
  GenerationStartOptions,
  GenerationSummary,
  ImportedVideoDescriptor,
  LogEntry,
  PreferencesSchema,
  Project,
  RecentProjectEntry,
  RenderJobInput,
  StartGenerationResult
} from '@shared/types'
import type { AuthUser, Device, EntitlementResponse } from '@shared/billing'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  ffmpegStatus: (): Promise<FfmpegStatus> => ipcRenderer.invoke(IpcChannels.ffmpegStatus),

  importVideos: (): Promise<ImportedVideoDescriptor[]> => ipcRenderer.invoke(IpcChannels.importVideos),
  importFolder: (): Promise<ImportedVideoDescriptor[]> => ipcRenderer.invoke(IpcChannels.importFolder),
  describePaths: (paths: string[]): Promise<ImportedVideoDescriptor[]> =>
    ipcRenderer.invoke(IpcChannels.describePaths, paths),
  chooseOutputFolder: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.chooseOutputFolder),
  openPath: (path: string): Promise<void> => ipcRenderer.invoke(IpcChannels.openPath, path),
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke(IpcChannels.showInFolder, path),
  getDiskSpace: (path: string): Promise<DiskSpaceInfo> => ipcRenderer.invoke(IpcChannels.getDiskSpace, path),

  getPreferences: (): Promise<PreferencesSchema> => ipcRenderer.invoke(IpcChannels.getPreferences),
  setPreferences: (partial: Partial<PreferencesSchema>): Promise<PreferencesSchema> =>
    ipcRenderer.invoke(IpcChannels.setPreferences, partial),

  newProjectId: (): Promise<string> => ipcRenderer.invoke(IpcChannels.newProjectId),
  saveProject: (project: Project): Promise<string> => ipcRenderer.invoke(IpcChannels.saveProject, project),
  loadProject: (filePath: string): Promise<Project> => ipcRenderer.invoke(IpcChannels.loadProject, filePath),
  listRecentProjects: (): Promise<RecentProjectEntry[]> => ipcRenderer.invoke(IpcChannels.listRecentProjects),
  exportCombinationsCsv: (jobs: GenerationJob[]): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.exportCombinationsCsv, jobs),

  startGeneration: (options: GenerationStartOptions): Promise<StartGenerationResult> =>
    ipcRenderer.invoke(IpcChannels.startGeneration, options),
  pauseGeneration: (): Promise<void> => ipcRenderer.invoke(IpcChannels.pauseGeneration),
  resumeGeneration: (): Promise<void> => ipcRenderer.invoke(IpcChannels.resumeGeneration),
  cancelGeneration: (): Promise<void> => ipcRenderer.invoke(IpcChannels.cancelGeneration),
  retryErrors: (): Promise<void> => ipcRenderer.invoke(IpcChannels.retryErrors),

  previewCombination: (input: RenderJobInput): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.previewCombination, input),

  generateSingle: (input: RenderJobInput & { outputFolder: string; fileName: string; deviceId: string | null }): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.generateSingle, input),

  onJobUpdated: (callback: (job: GenerationJob) => void) => subscribe(IpcChannels.onJobUpdated, callback),
  onGenerationSummary: (callback: (summary: GenerationSummary) => void) =>
    subscribe(IpcChannels.onGenerationSummary, callback),
  onGenerationFinished: (callback: (summary: GenerationSummary) => void) =>
    subscribe(IpcChannels.onGenerationFinished, callback),
  onLogEntry: (callback: (entry: LogEntry) => void) => subscribe(IpcChannels.onLogEntry, callback),
  onEntitlementChanged: (callback: () => void) => subscribe(IpcChannels.onEntitlementChanged, callback),
  onAuthHandoffComplete: (callback: (payload: { user: AuthUser | null; error?: string }) => void) =>
    subscribe(IpcChannels.onAuthHandoffComplete, callback),

  // Auth
  authSignUp: (input: { name: string; email: string; password: string; tiktokUsername: string | null }) =>
    ipcRenderer.invoke(IpcChannels.authSignUp, input) as Promise<{ user: AuthUser | null; needsEmailConfirmation: boolean }>,
  authSignIn: (email: string, password: string): Promise<AuthUser | null> =>
    ipcRenderer.invoke(IpcChannels.authSignIn, { email, password }),
  authSignInWithGoogle: (): Promise<AuthUser | null> => ipcRenderer.invoke(IpcChannels.authSignInWithGoogle),
  authSignOut: (): Promise<void> => ipcRenderer.invoke(IpcChannels.authSignOut),
  authGetSession: (): Promise<{ user: AuthUser | null; hasToken: boolean }> => ipcRenderer.invoke(IpcChannels.authGetSession),
  authSendPasswordReset: (email: string): Promise<void> => ipcRenderer.invoke(IpcChannels.authSendPasswordReset, email),
  authUpdatePassword: (newPassword: string): Promise<void> => ipcRenderer.invoke(IpcChannels.authUpdatePassword, newPassword),

  // Billing / entitlement / devices
  getEntitlement: (): Promise<EntitlementResponse> => ipcRenderer.invoke(IpcChannels.getEntitlement),
  createCardCheckout: (): Promise<{ checkoutUrl?: string; alreadySubscribed?: boolean }> =>
    ipcRenderer.invoke(IpcChannels.createCardCheckout),
  createPixCheckout: (): Promise<{ checkoutUrl: string; reused?: boolean }> => ipcRenderer.invoke(IpcChannels.createPixCheckout),
  cancelSubscription: (): Promise<{ ok: true; cancelAtPeriodEnd: boolean }> => ipcRenderer.invoke(IpcChannels.cancelSubscription),
  reactivateSubscription: (): Promise<{ ok: true; note: string }> => ipcRenderer.invoke(IpcChannels.reactivateSubscription),
  reconcileSubscription: (): Promise<{ ok: true; changed: boolean }> => ipcRenderer.invoke(IpcChannels.reconcileSubscription),
  deleteAccount: (): Promise<{ ok: true }> => ipcRenderer.invoke(IpcChannels.deleteAccount),

  registerDevice: (): Promise<{ deviceId: string | null; trialEligible: boolean; deviceLimitReached: boolean; installationId: string }> =>
    ipcRenderer.invoke(IpcChannels.registerDevice),
  listDevices: (): Promise<Device[]> => ipcRenderer.invoke(IpcChannels.listDevices),
  revokeDevice: (deviceId: string): Promise<void> => ipcRenderer.invoke(IpcChannels.revokeDevice, deviceId)
}

export type VideoMixerApi = typeof api

contextBridge.exposeInMainWorld('api', api)
