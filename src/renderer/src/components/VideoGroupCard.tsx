import { useRef, useState } from 'react'
import { FolderOpen, Trash2, Type, Upload, UploadCloud } from 'lucide-react'
import type { VideoCategory } from '@shared/types'
import { useAppStore } from '../state/useAppStore'
import VideoItemRow from './VideoItemRow'
import { formatNumberPtBr } from '../utils/format'

const CATEGORY_META: Record<
  VideoCategory,
  { title: string; description: string; addLabel: string; badge: string }
> = {
  hook: {
    title: 'GANCHOS',
    description: 'Adicione os vídeos que iniciam seu conteúdo.',
    addLabel: 'ADICIONAR GANCHOS',
    badge: 'G'
  },
  body: {
    title: 'CORPOS',
    description: 'Adicione os vídeos principais explicando o produto.',
    addLabel: 'ADICIONAR CORPOS',
    badge: 'C'
  },
  cta: {
    title: 'CTAs',
    description: 'Adicione os vídeos de chamada para ação.',
    addLabel: 'ADICIONAR CTAs',
    badge: 'CTA'
  }
}

function extractDroppedPaths(dataTransfer: DataTransfer): string[] {
  const paths: string[] = []
  for (const file of Array.from(dataTransfer.files)) {
    const withPath = file as File & { path?: string }
    if (withPath.path) paths.push(withPath.path)
  }
  return paths
}

interface Props {
  category: VideoCategory
}

function VideoGroupCard({ category }: Props): JSX.Element {
  const meta = CATEGORY_META[category]
  const listKey = category === 'hook' ? 'hooks' : category === 'body' ? 'bodies' : 'ctas'
  const videos = useAppStore((s) => s[listKey])
  const importCategory = useAppStore((s) => s.importCategory)
  const importCategoryFolder = useAppStore((s) => s.importCategoryFolder)
  const addDroppedPaths = useAppStore((s) => s.addDroppedPaths)
  const removeVideo = useAppStore((s) => s.removeVideo)
  const reorderVideos = useAppStore((s) => s.reorderVideos)
  const openPreview = useAppStore((s) => s.openPreview)
  const requestClearCategory = useAppStore((s) => s.requestClearCategory)
  const openHookTextsModal = useAppStore((s) => s.openHookTextsModal)
  const hookTextsCount = useAppStore((s) => s.hookTexts.filter((t) => t.enabled && t.text.trim().length > 0).length)
  const visualCtaEnabled = useAppStore((s) => s.visualCta.enabled)
  const setVisualCtaEnabled = useAppStore((s) => s.setVisualCtaEnabled)

  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const dragIndexRef = useRef<number | null>(null)

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-bg-border bg-bg-card p-5 shadow-card transition-colors ${
        dragActive ? 'drag-active' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={async (e) => {
        e.preventDefault()
        setDragActive(false)
        const paths = extractDroppedPaths(e.dataTransfer)
        if (paths.length > 0) await addDroppedPaths(category, paths)
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{meta.title}</h3>
          <p className="text-xs text-gray-400">{meta.description}</p>
        </div>
        <span className="rounded-full bg-bg-soft px-3 py-1 text-xs font-semibold text-brand-light">
          {formatNumberPtBr(videos.length)} {videos.length === 1 ? 'vídeo' : 'vídeos'}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          disabled={importing}
          onClick={async () => {
            setImporting(true)
            try {
              await importCategory(category)
            } finally {
              setImporting(false)
            }
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-brand-dark disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {meta.addLabel}
        </button>
        <button
          disabled={importing}
          onClick={async () => {
            setImporting(true)
            try {
              await importCategoryFolder(category)
            } finally {
              setImporting(false)
            }
          }}
          className="flex items-center gap-1.5 rounded-lg border border-bg-border px-3 py-2 text-xs text-gray-300 hover:bg-bg-soft disabled:opacity-50"
          title="Importar todos os vídeos de uma pasta"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Pasta
        </button>
      </div>

      {category === 'hook' && (
        <button
          onClick={openHookTextsModal}
          disabled={videos.length === 0}
          title={videos.length === 0 ? 'Adicione pelo menos um vídeo de Gancho primeiro.' : undefined}
          className="flex items-center gap-1.5 self-start text-xs text-gray-500 hover:text-brand-light disabled:cursor-not-allowed disabled:text-gray-700"
        >
          <Type className="h-3.5 w-3.5" />
          Texto de Gancho{hookTextsCount > 0 ? ` (${hookTextsCount})` : ''}
        </button>
      )}

      {category === 'cta' && (
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={visualCtaEnabled}
            onChange={(e) => setVisualCtaEnabled(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          CTA Visual Automático
        </label>
      )}

      {videos.length === 0 ? (
        <div
          className={`flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center text-xs text-gray-500 transition-colors ${
            dragActive ? 'border-brand text-brand-light' : 'border-bg-border'
          }`}
        >
          <UploadCloud className="h-5 w-5" />
          Arraste e solte os vídeos aqui
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-bg-border">
          {videos.map((video, index) => (
            <VideoItemRow
              key={video.id}
              video={video}
              index={index}
              onPreview={() => openPreview(video)}
              onRemove={() => removeVideo(category, video.id)}
              onDragStart={() => (dragIndexRef.current = index)}
              onDropOnRow={() => {
                if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
                  reorderVideos(category, dragIndexRef.current, index)
                }
                dragIndexRef.current = null
              }}
            />
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <button
          onClick={() => requestClearCategory(category)}
          className="flex items-center gap-1.5 self-start text-xs text-gray-500 hover:text-error"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Limpar todos
        </button>
      )}
    </div>
  )
}

export default VideoGroupCard
