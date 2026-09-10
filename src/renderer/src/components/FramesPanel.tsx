import { useAppStore } from '../state/useAppStore'
import { FRAME_ELIGIBLE_RESOLUTION } from '@shared/defaults'
import { formatNumberPtBr } from '../utils/format'

function FramesPanel(): JSX.Element {
  const frameSettings = useAppStore((s) => s.frameSettings)
  const frameFilePaths = useAppStore((s) => s.frameFilePaths)
  const chooseFrameFolder = useAppStore((s) => s.chooseFrameFolder)
  const setFramesEnabled = useAppStore((s) => s.setFramesEnabled)
  const clearFrameFolder = useAppStore((s) => s.clearFrameFolder)
  const resolution = useAppStore((s) => s.exportSettings.resolution)

  const resolutionMismatch = frameSettings.enabled && resolution !== FRAME_ELIGIBLE_RESOLUTION

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-bg-border bg-bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300">Molduras</h3>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={frameSettings.enabled}
            onChange={(e) => setFramesEnabled(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Ativar
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Sobrepõe uma moldura (PNG com fundo transparente) em cada vídeo gerado, sorteada aleatoriamente — uma diferente
        por vídeo, repetindo só depois de usar todas. Funciona apenas na resolução 9:16 (1080 × 1920).
      </p>

      <button
        onClick={chooseFrameFolder}
        className="self-start rounded-lg bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
      >
        Escolher Pasta de Molduras
      </button>

      {frameSettings.folderPath ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-bg-soft px-3 py-2 text-xs text-gray-300">
          <div className="min-w-0">
            <p className="truncate" title={frameSettings.folderPath}>
              {frameSettings.folderPath}
            </p>
            <p className="mt-1 text-gray-500">
              {formatNumberPtBr(frameFilePaths.length)} {frameFilePaths.length === 1 ? 'moldura encontrada' : 'molduras encontradas'}
            </p>
          </div>
          <button onClick={clearFrameFolder} className="shrink-0 text-gray-500 hover:text-error">
            Remover
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Nenhuma pasta selecionada.</p>
      )}

      {resolutionMismatch && (
        <p className="text-xs text-warning">
          A resolução atual não é 9:16 — as molduras não serão aplicadas nesta geração até você trocar em
          &ldquo;Configurações de Exportação&rdquo;.
        </p>
      )}
    </div>
  )
}

export default FramesPanel
