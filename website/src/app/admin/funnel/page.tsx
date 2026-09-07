'use client'

import { useCallback, useEffect, useState } from 'react'
import PeriodFilterBar from '@/components/admin/PeriodFilterBar'
import type { PeriodPreset } from '@/lib/admin/periods'

interface Step {
  key: string
  label: string
  count: number
  conversionFromPrevious: number | null
}

export default function FunnelPage(): JSX.Element {
  const [preset, setPreset] = useState<PeriodPreset>('last30')
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/admin/funnel?period=${preset}`)
    const json = await response.json()
    setSteps(json.steps ?? [])
    setLoading(false)
  }, [preset])

  useEffect(() => {
    load()
  }, [load])

  const max = Math.max(1, ...steps.map((s) => s.count))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-white">Funil</h1>
      <PeriodFilterBar value={preset} onChange={setPreset} compare={false} onCompareChange={() => undefined} />

      {loading && <p className="text-sm text-gray-500">Carregando...</p>}

      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step.key} className="rounded-xl border border-bg-border bg-bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-200">{step.label}</span>
              <span className="font-bold text-white">{step.count.toLocaleString('pt-BR')}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(step.count / max) * 100}%` }} />
            </div>
            {step.conversionFromPrevious !== null && (
              <p className="mt-1 text-xs text-gray-500">{step.conversionFromPrevious}% da etapa anterior</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
