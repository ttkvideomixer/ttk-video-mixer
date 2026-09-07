'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import PeriodFilterBar from '@/components/admin/PeriodFilterBar'
import MetricCard from '@/components/admin/MetricCard'
import RevenueChart from '@/components/admin/RevenueChart'
import type { PeriodPreset } from '@/lib/admin/periods'
import { formatCents, formatPercent } from '@/lib/admin/format'
import type { DashboardResponse } from '@/types/dashboard'

export default function AdminDashboardPage(): JSX.Element {
  const [preset, setPreset] = useState<PeriodPreset>('last30')
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>(undefined)
  const [compare, setCompare] = useState(true)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period: preset, compare: compare ? '1' : '0' })
      if (preset === 'custom' && customRange) {
        params.set('from', customRange.from)
        params.set('to', customRange.to)
      }
      const response = await fetch(`/api/admin/dashboard?${params.toString()}`)
      if (!response.ok) throw new Error('Falha ao carregar métricas.')
      const json = (await response.json()) as DashboardResponse
      setData(json)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }, [preset, compare, customRange])

  useEffect(() => {
    load()
  }, [load])

  const handlePeriodChange = (next: PeriodPreset, custom?: { from: string; to: string }): void => {
    setPreset(next)
    if (custom) setCustomRange(custom)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Painel Admin — TTK VIDEO MIXER</h1>
      </div>

      <PeriodFilterBar value={preset} onChange={handlePeriodChange} compare={compare} onCompareChange={setCompare} lastUpdated={lastUpdated} onRefresh={load} />

      {error && <p className="text-sm text-error">{error}</p>}
      {loading && !data && <DashboardSkeleton />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard label="Usuários totais" formattedValue={data.current.usersTotal.toLocaleString('pt-BR')} rawValue={data.current.usersTotal} previousRawValue={data.previous?.usersTotal} href="/admin/users" />
            <MetricCard label="Novos usuários" formattedValue={data.current.usersNew.toLocaleString('pt-BR')} rawValue={data.current.usersNew} previousRawValue={data.previous?.usersNew} />
            <MetricCard label="Assinantes ativos" formattedValue={data.current.subscribersActive.toLocaleString('pt-BR')} rawValue={data.current.subscribersActive} previousRawValue={data.previous?.subscribersActive} href="/admin/subscriptions?status=active" />
            <MetricCard label="Inadimplentes" formattedValue={data.current.subscribersPastDue.toLocaleString('pt-BR')} rawValue={data.current.subscribersPastDue} previousRawValue={data.previous?.subscribersPastDue} href="/admin/subscriptions?status=past_due" />
            <MetricCard label="Canceladas no período" formattedValue={data.current.subscriptionsCanceledInPeriod.toLocaleString('pt-BR')} rawValue={data.current.subscriptionsCanceledInPeriod} previousRawValue={data.previous?.subscriptionsCanceledInPeriod} />
            <MetricCard label="Trial ativo" formattedValue={data.current.trialActive.toLocaleString('pt-BR')} rawValue={data.current.trialActive} previousRawValue={data.previous?.trialActive} href="/admin/users?status=trial" />
            <MetricCard label="Receita bruta" formattedValue={formatCents(data.current.revenueGrossCents)} rawValue={data.current.revenueGrossCents} previousRawValue={data.previous?.revenueGrossCents} href="/admin/revenue" />
            <MetricCard label="MRR" formattedValue={formatCents(data.current.mrrCents)} rawValue={data.current.mrrCents} previousRawValue={data.previous?.mrrCents} />
            <MetricCard label="Churn" formattedValue={formatPercent(data.current.churnRatePercent)} />
            <MetricCard label="Conversão trial → Pro" formattedValue={data.current.trialToProConversions.toLocaleString('pt-BR')} rawValue={data.current.trialToProConversions} previousRawValue={data.previous?.trialToProConversions} />
            <MetricCard label="Downloads" formattedValue={(data.current.downloadsWindows + data.current.downloadsMacos).toLocaleString('pt-BR')} href="/admin/downloads" />
            <MetricCard label="Gerações autorizadas" formattedValue={data.current.generationsAuthorized.toLocaleString('pt-BR')} rawValue={data.current.generationsAuthorized} previousRawValue={data.previous?.generationsAuthorized} />
          </div>

          <div className="rounded-2xl border border-bg-border bg-bg-card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-300">Receita ao longo do tempo</h2>
            <RevenueChart data={data.timeseries} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-bg-border bg-bg-card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-300">Renovações</h2>
              <div className="flex justify-between text-sm text-gray-300">
                <span>Aprovadas</span>
                <span className="font-bold text-success">{data.current.renewalsApproved}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-300">
                <span>Falharam</span>
                <span className="font-bold text-error">{data.current.renewalsFailed}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-bg-border pt-2 text-sm text-gray-400">
                <span>Taxa de sucesso</span>
                <span>{formatPercent(data.current.renewalSuccessRatePercent)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-bg-border bg-bg-card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-300">Alertas de negócio</h2>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <Link href="/admin/subscriptions?status=past_due" className="text-warning hover:underline">
                    {data.current.subscribersPastDue} assinante(s) inadimplente(s)
                  </Link>
                </li>
                <li>
                  <Link href="/admin/non-renewed" className="text-error hover:underline">
                    Ver quem não renovou
                  </Link>
                </li>
                <li>
                  <Link href="/admin/users?trialExhausted=1" className="text-brand-light hover:underline">
                    Trials esgotados sem assinatura
                  </Link>
                </li>
                <li>
                  <Link href="/admin/webhooks" className="text-gray-400 hover:underline">
                    Ver monitor de webhooks
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DashboardSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-bg-border bg-bg-card" />
      ))}
    </div>
  )
}
