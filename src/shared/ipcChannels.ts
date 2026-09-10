export const IpcChannels = {
  // Import / filesystem
  importVideos: 'import:videos',
  importFolder: 'import:folder',
  describePaths: 'import:describe-paths',
  chooseOutputFolder: 'import:choose-output-folder',
  openPath: 'fs:open-path',
  showInFolder: 'fs:show-in-folder',
  getDiskSpace: 'fs:disk-space',

  // ffmpeg
  ffmpegStatus: 'ffmpeg:status',
  getAppVersion: 'app:get-version',

  // Projects
  saveProject: 'project:save',
  loadProject: 'project:load',
  listRecentProjects: 'project:list-recent',
  newProjectId: 'project:new-id',
  exportCombinationsCsv: 'project:export-csv',

  // Preferences
  getPreferences: 'preferences:get',
  setPreferences: 'preferences:set',

  // Generation
  startGeneration: 'generation:start',
  pauseGeneration: 'generation:pause',
  resumeGeneration: 'generation:resume',
  cancelGeneration: 'generation:cancel',
  retryErrors: 'generation:retry-errors',
  previewCombination: 'generation:preview-combination',

  // Events pushed from main -> renderer
  onJobUpdated: 'event:job-updated',
  onGenerationSummary: 'event:generation-summary',
  onGenerationFinished: 'event:generation-finished',
  onLogEntry: 'event:log-entry',
  onEntitlementChanged: 'event:entitlement-changed',
  onAuthHandoffComplete: 'event:auth-handoff-complete',
  onUpdateReady: 'event:update-ready',
  restartAndUpdate: 'app:restart-and-update',

  // Auth
  authSignUp: 'auth:sign-up',
  authSignIn: 'auth:sign-in',
  authSignInWithGoogle: 'auth:sign-in-google',
  authSignOut: 'auth:sign-out',
  authGetSession: 'auth:get-session',
  authSendPasswordReset: 'auth:send-password-reset',
  authUpdatePassword: 'auth:update-password',

  // Billing / entitlement / devices
  getEntitlement: 'billing:get-entitlement',
  createCardCheckout: 'billing:create-card-checkout',
  createPixCheckout: 'billing:create-pix-checkout',
  cancelSubscription: 'billing:cancel-subscription',
  reactivateSubscription: 'billing:reactivate-subscription',
  reconcileSubscription: 'billing:reconcile-subscription',
  deleteAccount: 'billing:delete-account',
  registerDevice: 'device:register',
  listDevices: 'device:list',
  revokeDevice: 'device:revoke'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
