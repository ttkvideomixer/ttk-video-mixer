import { useEffect } from 'react'
import { useAppStore } from './state/useAppStore'
import { useAuthStore } from './state/useAuthStore'
import AuthScreen from './components/AuthScreen'
import AccountScreen from './components/AccountScreen'
import PaywallModal from './components/PaywallModal'
import Header from './components/Header'
import ProjectBar from './components/ProjectBar'
import VideoGroupCard from './components/VideoGroupCard'
import CombinationCounter from './components/CombinationCounter'
import OutputFolderPanel from './components/OutputFolderPanel'
import ExportSettingsPanel from './components/ExportSettingsPanel'
import FramesPanel from './components/FramesPanel'
import CreativeVariationPanel from './components/CreativeVariationPanel'
import PreviewWorkspace from './components/PreviewWorkspace'
import GenerateBar from './components/GenerateBar'
import PreviewModal from './components/PreviewModal'
import HookTextsModal from './components/HookTextsModal'
import ConfirmGenerateModal from './components/ConfirmGenerateModal'
import ConfirmClearCategoryModal from './components/ConfirmClearCategoryModal'
import ConfirmCancelModal from './components/ConfirmCancelModal'
import ConfirmNewSeedModal from './components/ConfirmNewSeedModal'
import MissingRequirementsModal from './components/MissingRequirementsModal'
import CompletionModal from './components/CompletionModal'
import GenerationBusyModal from './components/GenerationBusyModal'
import ProgressScreen from './components/ProgressScreen'
import FfmpegStatusBar from './components/FfmpegStatusBar'
import UpdateReadyBanner from './components/UpdateReadyBanner'

function App(): JSX.Element {
  const ready = useAppStore((s) => s.ready)
  const initialize = useAppStore((s) => s.initialize)
  const currentView = useAppStore((s) => s.currentView)
  const activeModal = useAppStore((s) => s.activeModal)

  const newProject = useAppStore((s) => s.newProject)
  const saveProject = useAppStore((s) => s.saveProject)

  const authStatus = useAuthStore((s) => s.status)
  const authInitialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
    authInitialize()
  }, [initialize, authInitialize])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!e.ctrlKey) return
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        newProject()
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveProject()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [newProject, saveProject])

  if (!ready || authStatus === 'loading') {
    return (
      <div className="flex h-screen w-screen flex-col bg-bg text-bg-border">
        <UpdateReadyBanner />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">Carregando TTK Video Mixer...</p>
        </div>
      </div>
    )
  }

  if (authStatus === 'signedOut') {
    return (
      <>
        <UpdateReadyBanner />
        <AuthScreen />
      </>
    )
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-bg">
      <UpdateReadyBanner />
      <Header />
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {currentView === 'progress' ? (
          <ProgressScreen />
        ) : (
          <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
            <ProjectBar />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <VideoGroupCard category="hook" />
              <VideoGroupCard category="body" />
              <VideoGroupCard category="cta" />
            </div>

            <CombinationCounter />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <OutputFolderPanel />
              <ExportSettingsPanel />
            </div>

            <CreativeVariationPanel />

            <FramesPanel />

            <PreviewWorkspace />

            <GenerateBar />
          </div>
        )}
      </div>
      <FfmpegStatusBar />

      {activeModal === 'preview' && <PreviewModal />}
      {activeModal === 'hookTexts' && <HookTextsModal />}
      {activeModal === 'confirmGenerate' && <ConfirmGenerateModal />}
      {activeModal === 'confirmClearCategory' && <ConfirmClearCategoryModal />}
      {activeModal === 'confirmCancel' && <ConfirmCancelModal />}
      {activeModal === 'confirmNewSeed' && <ConfirmNewSeedModal />}
      {activeModal === 'completion' && <CompletionModal />}
      {activeModal === 'generationBusy' && <GenerationBusyModal />}
      {activeModal === 'missingRequirements' && <MissingRequirementsModal />}
      {activeModal === 'paywall' && <PaywallModal />}
      {activeModal === 'account' && <AccountScreen />}
    </div>
  )
}

export default App
