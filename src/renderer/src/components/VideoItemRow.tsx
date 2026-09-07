import type { VideoFile } from '@shared/types'
import { formatDuration } from '../utils/format'

interface Props {
  video: VideoFile
  index: number
  onPreview: () => void
  onRemove: () => void
  onDragStart: () => void
  onDropOnRow: () => void
}

function VideoItemRow({ video, index, onPreview, onRemove, onDragStart, onDropOnRow }: Props): JSX.Element {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropOnRow()
      }}
      className="flex cursor-grab items-center gap-3 border-b border-bg-border px-3 py-2 last:border-b-0 hover:bg-bg-soft active:cursor-grabbing"
    >
      <span className="w-6 shrink-0 text-xs font-mono text-gray-500">{String(index + 1).padStart(2, '0')}</span>

      {video.thumbnailDataUrl ? (
        <img src={video.thumbnailDataUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="h-9 w-9 shrink-0 rounded-md bg-bg-border" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-200" title={video.name}>
          {video.name}
        </p>
        {video.probeError && <p className="truncate text-xs text-error">{video.probeError}</p>}
      </div>

      <span className="shrink-0 font-mono text-xs text-gray-400">{formatDuration(video.duration)}</span>

      <button onClick={onPreview} className="shrink-0 rounded-md px-2 py-1 text-xs text-brand-light hover:bg-bg-card">
        Ver
      </button>
      <button onClick={onRemove} className="shrink-0 rounded-md px-2 py-1 text-xs text-gray-500 hover:text-error">
        Remover
      </button>
    </div>
  )
}

export default VideoItemRow
