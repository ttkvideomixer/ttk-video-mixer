import { useAppStore, type AudioSlot } from '../state/useAppStore'
import ModalShell from './ModalShell'

const SLOT_LABELS: Record<AudioSlot, string> = {
  hook: 'Gancho',
  body: 'Corpo',
  cta: 'CTA',
  full: 'Vídeo Completo'
}

const SLOT_KEYS: Record<AudioSlot, 'hookTracks' | 'bodyTracks' | 'ctaTracks' | 'fullTracks'> = {
  hook: 'hookTracks',
  body: 'bodyTracks',
  cta: 'ctaTracks',
  full: 'fullTracks'
}

function AudioFilesModal(): JSX.Element {
  const audioSettings = useAppStore((s) => s.audioSettings)
  const audioModalSlot = useAppStore((s) => s.audioModalSlot)
  const openAudioFilesModal = useAppStore((s) => s.openAudioFilesModal)
  const addAudioFiles = useAppStore((s) => s.addAudioFiles)
  const removeAudioFile = useAppStore((s) => s.removeAudioFile)
  const clearAudioSlot = useAppStore((s) => s.clearAudioSlot)
  const closeModal = useAppStore((s) => s.closeModal)

  const tracks = audioSettings[SLOT_KEYS[audioModalSlot]]

  const handleAddFiles = async (): Promise<void> => {
    const files = await window.api.selectAudioFiles()
    if (files.length > 0) addAudioFiles(audioModalSlot, files)
  }

  const handleAddFolder = async (): Promise<void> => {
    const files = await window.api.selectAudioFolder()
    if (files.length > 0) addAudioFiles(audioModalSlot, files)
  }

  return (
    <ModalShell title="Gerenciar Áudio" onClose={closeModal}>
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(SLOT_LABELS) as AudioSlot[]).map((slot) => (
          <button
            key={slot}
            onClick={() => openAudioFilesModal(slot)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
              audioModalSlot === slot
                ? 'border-brand bg-brand text-white'
                : 'border-bg-border bg-bg-soft text-gray-300 hover:bg-bg-border'
            }`}
          >
            {SLOT_LABELS[slot]} ({audioSettings[SLOT_KEYS[slot]].length})
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-gray-500">
        {audioModalSlot === 'full'
          ? 'Essas trilhas cobrem o vídeo inteiro, do início do gancho ao final do CTA.'
          : `Essas trilhas são anexadas apenas em ${SLOT_LABELS[audioModalSlot].toLowerCase()}.`}{' '}
        Uma trilha é sorteada por vídeo gerado. Se for curta, repete até o fim do trecho; se for longa, é cortada. Você
        também pode escolher um vídeo — o áudio dele é usado automaticamente.
      </p>

      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {tracks.length === 0 && (
          <p className="rounded-lg bg-bg-soft px-3 py-4 text-center text-xs text-gray-500">
            Nenhum áudio adicionado ainda.
          </p>
        )}
        {tracks.map((track, index) => (
          <div key={track.id} className="flex items-center gap-2 rounded-lg bg-bg-soft p-2">
            <span className="w-6 shrink-0 text-center text-xs text-gray-500">{index + 1}</span>
            <span className="flex-1 truncate text-sm text-white" title={track.path}>
              {track.name}
            </span>
            <button
              onClick={() => removeAudioFile(audioModalSlot, track.id)}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-gray-500 hover:text-error"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleAddFiles}
          className="flex-1 rounded-lg border border-dashed border-bg-border py-2 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
        >
          + Adicionar Áudio
        </button>
        <button
          onClick={handleAddFolder}
          className="flex-1 rounded-lg border border-dashed border-bg-border py-2 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
        >
          + Adicionar Pasta
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        {tracks.length > 0 ? (
          <button
            onClick={() => clearAudioSlot(audioModalSlot)}
            className="rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-error"
          >
            Remover todos deste slot
          </button>
        ) : (
          <span />
        )}
        <button onClick={closeModal} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Concluído
        </button>
      </div>
    </ModalShell>
  )
}

export default AudioFilesModal
