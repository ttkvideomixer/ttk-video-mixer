import { useAppStore } from '../state/useAppStore'
import { calculateTotalCombinations } from '@shared/combinations'
import { LARGE_PROJECT_WARNING_THRESHOLD, VERY_LARGE_PROJECT_WARNING_THRESHOLD } from '@shared/defaults'
import { formatNumberPtBr } from '../utils/format'

function CombinationCounter(): JSX.Element {
  const hooksCount = useAppStore((s) => s.hooks.length)
  const bodiesCount = useAppStore((s) => s.bodies.length)
  const ctasCount = useAppStore((s) => s.ctas.length)
  const combinationSettings = useAppStore((s) => s.combinationSettings)
  const enabledHookTextsCount = useAppStore(
    (s) => s.hookTexts.filter((t) => t.enabled && t.text.trim().length > 0).length
  )

  const baseTotal = calculateTotalCombinations(hooksCount, bodiesCount, ctasCount)
  const multiplying = combinationSettings.multiplyByHookText && enabledHookTextsCount > 0
  const total = multiplying ? baseTotal * enabledHookTextsCount : baseTotal
  const effectiveTotal =
    combinationSettings.mode === 'limit' && combinationSettings.maxCombinations !== null
      ? Math.min(total, combinationSettings.maxCombinations)
      : total

  const isVeryLarge = effectiveTotal > VERY_LARGE_PROJECT_WARNING_THRESHOLD
  const isLarge = effectiveTotal > LARGE_PROJECT_WARNING_THRESHOLD

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-6 shadow-card">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Resultado</h2>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="gradient-text text-5xl font-extrabold">{formatNumberPtBr(effectiveTotal)}</span>
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-light">
          {effectiveTotal === 1 ? 'vídeo será gerado' : 'vídeos serão gerados'}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-center text-sm text-gray-300">
        <Metric label="Ganchos" value={hooksCount} />
        <span className="text-gray-600">×</span>
        <Metric label="Corpos" value={bodiesCount} />
        <span className="text-gray-600">×</span>
        <Metric label="CTAs" value={ctasCount} />
        {multiplying && (
          <>
            <span className="text-gray-600">×</span>
            <Metric label="Textos" value={enabledHookTextsCount} />
          </>
        )}
        <span className="text-gray-600">=</span>
        <Metric label="Combinações" value={total} highlight />
      </div>

      {combinationSettings.mode === 'limit' && combinationSettings.maxCombinations !== null && (
        <p className="mt-4 text-center text-xs text-gray-500">
          Amostragem ativa: {formatNumberPtBr(effectiveTotal)} de {formatNumberPtBr(total)} combinações totais serão
          geradas.
        </p>
      )}

      {isVeryLarge && (
        <p className="mt-4 rounded-lg bg-warning/10 px-4 py-2 text-center text-xs text-warning">
          Projeto muito grande: {formatNumberPtBr(effectiveTotal)} vídeos serão gerados. Isso pode levar bastante
          tempo e ocupar muito espaço em disco.
        </p>
      )}
      {!isVeryLarge && isLarge && (
        <p className="mt-4 rounded-lg bg-warning/10 px-4 py-2 text-center text-xs text-warning">
          Projeto grande: {formatNumberPtBr(effectiveTotal)} vídeos serão gerados.
        </p>
      )}
    </div>
  )
}

function Metric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }): JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-bold ${highlight ? 'text-brand-light' : 'text-white'}`}>
        {formatNumberPtBr(value)}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
    </div>
  )
}

export default CombinationCounter
