export default function QuizProgress({ current, total }: { current: number; total: number }): JSX.Element {
  const percent = Math.round((current / total) * 100)
  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Pergunta {current} de {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
