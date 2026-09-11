import { ArrowRight, Download, Sparkles } from 'lucide-react'
import { getMissingGenerateRequirements, useAppStore } from '../state/useAppStore'
import { calculateTotalCombinations } from '@shared/combinations'
import { buildGenerationJobs } from '@shared/jobBuilder'
import { formatNumberPtBr } from '../utils/format'

const LIMIT_PRESETS = [100, 200, 500]

function GenerateBar(): JSX.Element {
  const hooks = useAppStore((s) => s.hooks)
  const bodies = useAppStore((s) => s.bodies)
  const ctas = useAppStore((s) => s.ctas)
  const outputFolder = useAppStore((s) => s.outputFolder)
  const combinationSettings = useAppStore((s) => s.combinationSettings)
  const setCombinationSettings = useAppStore((s) => s.setCombinationSettings)
  const requestGenerate = useAppStore((s) => s.requestGenerate)
  const prefix = useAppStore((s) => s.prefix)
  const computeOutputFolderPath = useAppStore((s) => s.computeOutputFolderPath)
  const hookTexts = useAppStore((s) => s.hookTexts)
  const visualCta = useAppStore((s) => s.visualCta)
  const creativeVariation = useAppStore((s) => s.creativeVariation)
  const projectSeed = useAppStore((s) => s.projectSeed)
  const previewApproved = useAppStore((s) => s.previewApproved)
  const generation = useAppStore((s) => s.generation)
  const goToProgress = useAppStore((s) => s.goToProgress)

  const enabledHookTexts = hookTexts.filter((t) => t.enabled && t.text.trim().length > 0)
  const baseTotal = calculateTotalCombinations(hooks.length, bodies.length, ctas.length)
  const effectiveTotal =
    combinationSettings.multiplyByHookText && enabledHookTexts.length > 0
      ? baseTotal * enabledHookTexts.length
      : baseTotal

  const missing = getMissingGenerateRequirements({ hooks, bodies, ctas, outputFolder, previewApproved })

  const handleExportCsv = async () => {
    const outputFolderPath = computeOutputFolderPath()
    if (!outputFolderPath) return
    const jobs = buildGenerationJobs({
      hooks,
      bodies,
      ctas,
      prefix,
      outputFolder: outputFolderPath,
      combinationSettings,
      hookTexts,
      visualCtaEnabled: visualCta.enabled,
      creativeVariation,
      projectSeed,
      frameFilePaths: []
    })
    await window.api.exportCombinationsCsv(jobs)
  }

  const hasBackgroundGeneration = generation.jobOrder.length > 0
  const bgSummary = generation.summary

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-card p-5 shadow-card">
      {hasBackgroundGeneration && (
        <button
          onClick={goToProgress}
          className="flex items-center justify-between rounded-xl border border-brand bg-brand/10 px-4 py-3 text-left hover:bg-brand/20"
        >
          <span className="text-sm font-semibold text-brand-light">
            {generation.isRunning ? 'Geração em andamento' : 'Última geração'}
            {bgSummary && (
              <span className="ml-2 font-normal text-gray-400">
                ({formatNumberPtBr(bgSummary.completed)} / {formatNumberPtBr(bgSummary.total)})
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold uppercase text-black">
            Ver Andamento
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300">Seleção de Combinações</h3>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCombinationSettings({ mode: 'all', maxCombinations: null })}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
            combinationSettings.mode === 'all'
              ? 'border-brand bg-brand text-black'
              : 'border-bg-border bg-bg-soft text-gray-300 hover:bg-bg-border'
          }`}
        >
          Todas ({formatNumberPtBr(effectiveTotal)})
        </button>
        {LIMIT_PRESETS.map((n) => (
          <button
            key={n}
            disabled={n >= effectiveTotal}
            onClick={() => setCombinationSettings({ mode: 'limit', maxCombinations: n })}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-30 ${
              combinationSettings.mode === 'limit' && combinationSettings.maxCombinations === n
                ? 'border-brand bg-brand text-black'
                : 'border-bg-border bg-bg-soft text-gray-300 hover:bg-bg-border'
            }`}
          >
            {n}
          </button>
        ))}

        <label className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={combinationSettings.shuffle}
            onChange={(e) => setCombinationSettings({ shuffle: e.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          Embaralhar ordem
        </label>

        <button
          onClick={handleExportCsv}
          disabled={effectiveTotal === 0 || !outputFolder}
          className="flex items-center gap-1.5 rounded-lg border border-bg-border px-3 py-2 text-xs text-gray-300 hover:bg-bg-soft disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Lista (CSV)
        </button>
      </div>

      {enabledHookTexts.length > 0 && (
        <label className="flex items-center gap-2 rounded-lg bg-bg-soft px-3 py-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={combinationSettings.multiplyByHookText}
            onChange={(e) => setCombinationSettings({ multiplyByHookText: e.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          Cada texto gera uma nova variação ({formatNumberPtBr(baseTotal)} × {enabledHookTexts.length} textos ={' '}
          {formatNumberPtBr(baseTotal * enabledHookTexts.length)} vídeos)
        </label>
      )}

      <div className="flex flex-col items-center gap-2 border-t border-bg-border pt-4">
        <button
          onClick={requestGenerate}
          className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-tiktok-gradient py-4 text-lg font-extrabold uppercase tracking-wide text-black shadow-glow transition-all duration-150 hover:-translate-y-0.5 hover:opacity-90"
        >
          <Sparkles className="h-5 w-5" />
          Gerar Vídeos
        </button>
        {missing.length > 0 && (
          <ul className="text-center text-xs text-gray-500">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default GenerateBar
