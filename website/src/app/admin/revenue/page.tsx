'use client'

import { useCallback, useEffect, useState } from 'react'
import PeriodFilterBar from '@/components/admin/PeriodFilterBar'
import MetricCard from '@/components/admin/MetricCard'
import RevenueChart from '@/components/admin/RevenueChart'
import { formatCents } from '@/lib/admin/format'
import type { PeriodPreset } from '@/lib/admin/periods'
import type { DashboardResponse } from '@/types/dashboard'

export default function RevenuePage(): JSX.Element {
  const [preset, setPreset] = useState<PeriodPreset>('thisMonth')
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>()
  const [compare, setCompare] = useState(true)
  const [data, setData] = useState<DashboardResponse | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ period: preset, compare: compare ? '1' : '0' })
    if (preset === 'custom' && customRange) {
      params.set('from', customRange.from)
      params.set('to', customRange.to)
    }
    const response = await fetch(`/api/admin/dashboard?${params.toString()}`)
    setData(await response.json())
  }, [preset, compare, customRange])

  useEffect(() => {
    load()
  }, [load])

  const pixTotal = data?.timeseries.reduce((sum, p) => sum + p.pix, 0) ?? 0
  const cardTotal = data?.timeseries.reduce((sum, p) => sum + p.card, 0) ?? 0
  const methodTotal = pixTotal + cardTotal || 1

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-white">Receita</h1>
      <PeriodFilterBar
        value={preset}
        onChange={(p, c) => {
          setPreset(p)
          if (c) setCustomRange(c)
        }}
        compare={compare}
        onCompareChange={setCompare}
      />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard label="Receita bruta" formattedValue={formatCents(data.current.revenueGrossCents)} rawValue={data.current.revenueGrossCents} previousRawValue={data.previous?.revenueGrossCents} />
            <MetricCard label="Refunds" formattedValue={formatCents(data.current.revenueRefundsCents)} rawValue={data.current.revenueRefundsCents} previousRawValue={data.previous?.revenueRefundsCents} />
            <MetricCard label="Receita líquida" formattedValue={formatCents(data.current.revenueNetCents)} rawValue={data.current.revenueNetCents} previousRawValue={data.previous?.revenueNetCents} />
            <MetricCard label="MRR" formattedValue={formatCents(data.current.mrrCents)} rawValue={data.current.mrrCents} previousRawValue={data.previous?.mrrCents} />
          </div>
          <p className="text-xs text-gray-500">
            Taxas da Pagar.me não estão disponíveis nesta integração — mostramos receita bruta e refunds, sem inventar uma &ldquo;receita líquida após taxas&rdquo;.
          </p>

          <div className="rounded-2xl border border-bg-border bg-bg-card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-300">Receita ao longo do tempo</h2>
            <RevenueChart data={data.timeseries} />
          </div>

          <div className="rounded-2xl border border-bg-border bg-bg-card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-300">Receita por método</h2>
            <div className="flex flex-col gap-2 text-sm">
              <MethodBar label="Cartão recorrente" value={cardTotal} total={methodTotal} />
              <MethodBar label="Pix 30 dias" value={pixTotal} total={methodTotal} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MethodBar({ label, value, total }: { label: string; value: number; total: number }): JSX.Element {
  const percent = Math.round((value / total) * 100)
  return (
    <div>
      <div className="flex justify-between text-gray-300">
        <span>{label}</span>
        <span>
          {formatCents(value)} ({percent}%)
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
