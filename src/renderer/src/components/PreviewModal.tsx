import { useRef } from 'react'
import { useAppStore } from '../state/useAppStore'
import { toMediaUrl } from '@shared/mediaUrl'
import ModalShell from './ModalShell'

function PreviewModal(): JSX.Element | null {
  const video = useAppStore((s) => s.previewVideo)
  const closePreview = useAppStore((s) => s.closePreview)
  const videoRef = useRef<HTMLVideoElement>(null)

  if (!video) return null

  const skip = (seconds: number): void => {
    if (videoRef.current) videoRef.current.currentTime += seconds
  }

  return (
    <ModalShell onClose={closePreview} title={video.name}>
      <video
        ref={videoRef}
        src={toMediaUrl(video.path)}
        controls
        autoPlay
        className="max-h-[60vh] w-full rounded-xl bg-black"
      />
      <div className="mt-3 flex justify-center gap-2">
        <button onClick={() => skip(-5)} className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
          -5s
        </button>
        <button onClick={() => skip(5)} className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
          +5s
        </button>
      </div>
    </ModalShell>
  )
}

export default PreviewModal
