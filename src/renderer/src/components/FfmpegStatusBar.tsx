import { useAppStore } from '../state/useAppStore'

function FfmpegStatusBar(): JSX.Element {
  const status = useAppStore((s) => s.ffmpegStatus)

  return (
    <footer className="flex items-center justify-between border-t border-bg-border bg-bg-card px-6 py-2 text-xs text-gray-500">
      <span>TTK Video Mixer</span>
      <span className={status?.ready ? 'text-success' : 'text-error'}>
        FFmpeg: {status?.ready ? 'Pronto' : status?.message ?? 'Verificando...'}
      </span>
    </footer>
  )
}

export default FfmpegStatusBar
