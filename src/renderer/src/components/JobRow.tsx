import { Ban, Circle, CircleCheck, CircleX, Loader2 } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'
import { formatPercentPtBr } from '../utils/format'

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  done: CircleCheck,
  skipped: CircleCheck,
  processing: Loader2,
  pending: Circle,
  error: CircleX,
  canceled: Ban
}

const STATUS_COLOR: Record<string, string> = {
  done: 'text-success',
  skipped: 'text-success',
  processing: 'text-warning',
  pending: 'text-gray-500',
  error: 'text-error',
  canceled: 'text-gray-500'
}

interface Props {
  jobId: string
  style: React.CSSProperties
}

function JobRow({ jobId, style }: Props): JSX.Element {
  const job = useAppStore((s) => s.generation.jobsById[jobId])
  if (!job) return <div style={style} />

  const StatusIcon = STATUS_ICON[job.status]

  return (
    <div style={style} className="flex items-center gap-3 border-b border-bg-border px-4 text-sm">
      <span className={`flex w-5 shrink-0 justify-center ${STATUS_COLOR[job.status]}`}>
        <StatusIcon className={`h-4 w-4 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
      </span>
      <span className="flex-1 truncate font-mono text-gray-300" title={job.outputFileName}>
        {job.outputFileName}
      </span>
      {job.status === 'processing' && (
        <span className="w-14 shrink-0 text-right text-xs text-warning">{formatPercentPtBr(job.progress)}</span>
      )}
      {job.status === 'error' && (
        <span className="max-w-xs shrink-0 truncate text-xs text-error" title={job.error ?? ''}>
          {job.error}
        </span>
      )}
      {(job.status === 'done' || job.status === 'skipped') && (
        <button
          onClick={() => window.api.showInFolder(job.outputPath)}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-brand-light hover:bg-bg-soft"
        >
          Mostrar na pasta
        </button>
      )}
    </div>
  )
}

export default JobRow
