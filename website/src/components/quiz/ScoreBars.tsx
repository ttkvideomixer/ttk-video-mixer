import type { Scores } from '@/types/quiz'

const LABELS: Record<keyof Scores, string> = {
  volume: 'Volume',
  consistency: 'Consistência',
  variation: 'Variação',
  automation: 'Automação'
}

export default function ScoreBars({ scores }: { scores: Scores }): JSX.Element {
  const max = Math.max(1, ...Object.values(scores))

  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(LABELS) as (keyof Scores)[]).map((key) => {
        const percent = Math.round((scores[key] / max) * 100)
        return (
          <div key={key}>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{LABELS[key]}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )
      })}
      <p className="mt-1 text-[11px] text-gray-600">Perfil baseado nas suas respostas.</p>
    </div>
  )
}
