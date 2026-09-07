'use client'

import { useState } from 'react'
import { PERIOD_PRESETS, periodLabel, type PeriodPreset } from '@/lib/admin/periods'

interface Props {
  value: PeriodPreset
  onChange: (preset: PeriodPreset, customRange?: { from: string; to: string }) => void
  compare: boolean
  onCompareChange: (value: boolean) => void
  lastUpdated?: Date | null
  onRefresh?: () => void
}

export default function PeriodFilterBar({ value, onChange, compare, onCompareChange, lastUpdated, onRefresh }: Props): JSX.Element {
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-bg-border bg-bg-card p-3">
      <div className="flex flex-wrap gap-1">
        {PERIOD_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
              value === preset ? 'bg-brand text-white' : 'text-gray-400 hover:bg-bg-soft'
            }`}
          >
            {periodLabel(preset)}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border border-bg-border bg-bg-soft px-2 py-1 text-xs text-white" />
          <span className="text-gray-500">até</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border border-bg-border bg-bg-soft px-2 py-1 text-xs text-white" />
          <button
            onClick={() => customFrom && customTo && onChange('custom', { from: customFrom, to: customTo })}
            className="rounded-md border border-bg-border px-2 py-1 text-xs text-gray-300 hover:bg-bg-soft"
          >
            Aplicar
          </button>
        </div>
      )}

      <label className="ml-auto flex items-center gap-2 text-xs text-gray-400">
        <input type="checkbox" checked={compare} onChange={(e) => onCompareChange(e.target.checked)} className="accent-brand" />
        Comparar com período anterior
      </label>

      {lastUpdated && <span className="text-[11px] text-gray-600">Atualizado há {Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000))}s</span>}
      {onRefresh && (
        <button onClick={onRefresh} className="rounded-md border border-bg-border px-2.5 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
          Atualizar dados
        </button>
      )}
    </div>
  )
}
