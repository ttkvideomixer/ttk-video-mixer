'use client'

import { useEffect, useState } from 'react'

interface QuestionBreakdown {
  question: string
  options: { label: string; count: number; percent: number }[]
}

interface InsightsResponse {
  totalCompleted: number
  profileDistribution: { profileType: string; count: number; percent: number }[]
  questionBreakdown: QuestionBreakdown[]
}

export default function InsightsPage(): JSX.Element {
  const [data, setData] = useState<InsightsResponse | null>(null)

  useEffect(() => {
    fetch('/api/admin/insights')
      .then((r) => r.json())
      .then(setData)
  }, [])

  if (!data) return <p className="text-sm text-gray-500">Carregando...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">Insights do Onboarding</h1>
        <p className="text-sm text-gray-400">{data.totalCompleted} quizzes concluídos.</p>
      </div>

      <div className="rounded-2xl border border-bg-border bg-bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-300">Perfis de creator</h2>
        <div className="flex flex-col gap-2">
          {data.profileDistribution.map((p) => (
            <div key={p.profileType}>
              <div className="flex justify-between text-sm text-gray-300">
                <span>{p.profileType}</span>
                <span>
                  {p.count} ({p.percent}%)
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${p.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.questionBreakdown.map((q) => (
        <div key={q.question} className="rounded-2xl border border-bg-border bg-bg-card p-5">
          <h3 className="mb-3 text-sm font-bold text-white">{q.question}</h3>
          <div className="flex flex-col gap-1.5">
            {q.options
              .slice()
              .sort((a, b) => b.percent - a.percent)
              .map((option) => (
                <div key={option.label} className="flex justify-between text-xs text-gray-400">
                  <span>{option.label}</span>
                  <span>{option.percent}%</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
