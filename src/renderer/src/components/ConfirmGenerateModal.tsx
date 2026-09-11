import { useAppStore } from '../state/useAppStore'
import { calculateTotalCombinations } from '@shared/combinations'
import { LARGE_PROJECT_WARNING_THRESHOLD } from '@shared/defaults'
import { formatNumberPtBr } from '../utils/format'
import ModalShell from './ModalShell'

function ConfirmGenerateModal(): JSX.Element {
  const hooks = useAppStore((s) => s.hooks)
  const bodies = useAppStore((s) => s.bodies)
  const ctas = useAppStore((s) => s.ctas)
  const combinationSettings = useAppStore((s) => s.combinationSettings)
  const enabledHookTextsCount = useAppStore(
    (s) => s.hookTexts.filter((t) => t.enabled && t.text.trim().length > 0).length
  )
  const closeModal = useAppStore((s) => s.closeModal)
  const confirmGenerate = useAppStore((s) => s.confirmGenerate)
  const computeOutputFolderPath = useAppStore((s) => s.computeOutputFolderPath)

  const baseTotal = calculateTotalCombinations(hooks.length, bodies.length, ctas.length)
  const total =
    combinationSettings.multiplyByHookText && enabledHookTextsCount > 0 ? baseTotal * enabledHookTextsCount : baseTotal
  const effectiveTotal =
    combinationSettings.mode === 'limit' && combinationSettings.maxCombinations !== null
      ? Math.min(total, combinationSettings.maxCombinations)
      : total
  const outputPath = computeOutputFolderPath()

  return (
    <ModalShell title="Confirmar Geração" onClose={closeModal}>
      <p className="text-sm text-gray-300">
        Você está prestes a gerar <strong className="text-white">{formatNumberPtBr(effectiveTotal)}</strong>{' '}
        {effectiveTotal === 1 ? 'vídeo' : 'vídeos'}.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-400">
        <span>Ganchos:</span>
        <span className="text-right text-white">{formatNumberPtBr(hooks.length)}</span>
        <span>Corpos:</span>
        <span className="text-right text-white">{formatNumberPtBr(bodies.length)}</span>
        <span>CTAs:</span>
        <span className="text-right text-white">{formatNumberPtBr(ctas.length)}</span>
        <span className="font-semibold text-gray-300">Total:</span>
        <span className="text-right font-semibold text-brand-light">
          {formatNumberPtBr(effectiveTotal)} vídeos
        </span>
      </div>

      <p className="mt-4 truncate rounded-lg bg-bg-soft px-3 py-2 text-xs text-gray-400" title={outputPath ?? ''}>
        Pasta: {outputPath}
      </p>

      {effectiveTotal > LARGE_PROJECT_WARNING_THRESHOLD && (
        <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          Você está gerando {formatNumberPtBr(effectiveTotal)} vídeos. Certifique-se de possuir espaço suficiente no
          disco.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={closeModal} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Cancelar
        </button>
        <button
          onClick={confirmGenerate}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-black hover:bg-brand-dark"
        >
          Iniciar Geração
        </button>
      </div>
    </ModalShell>
  )
}

export default ConfirmGenerateModal
