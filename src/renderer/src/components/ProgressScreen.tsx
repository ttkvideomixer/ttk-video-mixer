import { useEffect, useMemo, useState } from 'react'
import { FixedSizeList } from 'react-window'
import { useAppStore } from '../state/useAppStore'
import JobRow from './JobRow'
import LogPanel from './LogPanel'
import { formatElapsed, formatNumberPtBr, formatPercentPtBr } from '../utils/format'

const ROW_HEIGHT = 36

function ProgressScreen(): JSX.Element {
  const generation = useAppStore((s) => s.generation)
  const pauseGeneration = useAppStore((s) => s.pauseGeneration)
  const resumeGeneration = useAppStore((s) => s.resumeGeneration)
  const requestCancelGeneration = useAppStore((s) => s.requestCancelGeneration)
  const goToHome = useAppStore((s) => s.goToHome)
  const retryErrors = useAppStore((s) => s.retryErrors)
  const logPanelOpen = useAppStore((s) => s.logPanelOpen)
  const toggleLogPanel = useAppStore((s) => s.toggleLogPanel)

  const [, forceTick] = useState(0)

  const summary = generation.summary ?? { total: 0, completed: 0, errors: 0, skipped: 0, processing: 0, pending: 0 }
  const ratio = summary.total > 0 ? (summary.completed + summary.errors) / summary.total : 0
  // Belt-and-suspenders: derive "still working" from the live counts too, not
  // only the isRunning flag, so pause/cancel never disappear while jobs are
  // visibly still processing/pending.
  const isActive = generation.isRunning || summary.processing > 0 || summary.pending > 0

  const currentJobName = useMemo(() => {
    for (const id of generation.jobOrder) {
      if (generation.jobsById[id]?.status === 'processing') return generation.jobsById[id].outputFileName
    }
    return null
  }, [generation.jobOrder, generation.jobsById])

  const elapsedMs = generation.startedAt ? Date.now() - generation.startedAt : 0
  const doneCount = summary.completed + summary.errors
  const avgMsPerJob = doneCount > 0 ? elapsedMs / doneCount : null
  const remainingCount = summary.total - doneCount
  const estimatedRemainingMs = avgMsPerJob !== null ? avgMsPerJob * remainingCount : null

  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-5">
      <div className="rounded-2xl border border-bg-border bg-bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wide text-white">Gerando Vídeos</h2>
          <span className="font-mono text-sm text-gray-400">
            {formatNumberPtBr(doneCount)} / {formatNumberPtBr(summary.total)}
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-right text-sm font-semibold text-brand-light">{formatPercentPtBr(ratio)}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat value={summary.completed} label="Concluídos" color="text-success" />
          <Stat value={remainingCount} label="Restantes" color="text-gray-300" />
          <Stat value={summary.processing} label="Processando" color="text-warning" />
          <Stat value={summary.errors} label="Erros" color="text-error" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <span>Tempo decorrido: {formatElapsed(elapsedMs)}</span>
          <span>
            Estimativa restante:{' '}
            {estimatedRemainingMs !== null && remainingCount > 0 ? formatElapsed(estimatedRemainingMs) : remainingCount === 0 ? '--' : 'Calculando...'}
          </span>
        </div>

        {currentJobName && (
          <p className="mt-3 truncate rounded-lg bg-bg-soft px-3 py-2 text-xs text-gray-400">
            Gerando: <span className="font-mono text-gray-200">{currentJobName}</span>
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={goToHome} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
            Voltar ao Início
          </button>
          {isActive && !generation.isPaused && (
            <button onClick={pauseGeneration} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
              Pausar
            </button>
          )}
          {isActive && generation.isPaused && (
            <button onClick={resumeGeneration} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black hover:bg-brand-dark">
              Continuar
            </button>
          )}
          {isActive && (
            <button onClick={requestCancelGeneration} className="rounded-lg border border-error px-4 py-2 text-sm text-error hover:bg-error/10">
              Cancelar Geração
            </button>
          )}
          {!isActive && summary.errors > 0 && (
            <button onClick={retryErrors} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black hover:bg-brand-dark">
              Tentar Novamente os Erros
            </button>
          )}
          <button onClick={toggleLogPanel} className="ml-auto rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
            {logPanelOpen ? 'Fechar Log' : 'Ver Log'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-bg-border bg-bg-card shadow-card">
        <FixedSizeList
          height={420}
          width="100%"
          itemCount={generation.jobOrder.length}
          itemSize={ROW_HEIGHT}
          itemKey={(index) => generation.jobOrder[index]}
        >
          {({ index, style }) => <JobRow jobId={generation.jobOrder[index]} style={style} />}
        </FixedSizeList>
      </div>

      {logPanelOpen && <LogPanel />}
    </div>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color: string }): JSX.Element {
  return (
    <div className="rounded-xl bg-bg-soft py-4 text-center">
      <p className={`text-3xl font-extrabold ${color}`}>{formatNumberPtBr(value)}</p>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  )
}

export default ProgressScreen
