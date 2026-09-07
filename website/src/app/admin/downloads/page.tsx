'use client'

import { useCallback, useEffect, useState } from 'react'
import PeriodFilterBar from '@/components/admin/PeriodFilterBar'
import MetricCard from '@/components/admin/MetricCard'
import { formatDateTime } from '@/lib/admin/format'
import type { PeriodPreset } from '@/lib/admin/periods'

interface DownloadsResponse {
  total: number
  windows: number
  macos: number
  loggedIn: number
  anonymous: number
  recent: { properties: Record<string, unknown>; user_id: string | null; created_at: string }[]
}

export default function DownloadsPage(): JSX.Element {
  const [preset, setPreset] = useState<PeriodPreset>('last30')
  const [data, setData] = useState<DownloadsResponse | null>(null)

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/downloads?period=${preset}`)
    setData(await response.json())
  }, [preset])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-white">Downloads</h1>
      <PeriodFilterBar value={preset} onChange={setPreset} compare={false} onCompareChange={() => undefined} />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard label="Total" formattedValue={String(data.total)} />
            <MetricCard label="Windows" formattedValue={String(data.windows)} />
            <MetricCard label="macOS" formattedValue={String(data.macos)} />
            <MetricCard label="Logados / Anônimos" formattedValue={`${data.loggedIn} / ${data.anonymous}`} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Plataforma</th>
                  <th className="px-3 py-2">Usuário</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r, i) => (
                  <tr key={i} className="border-b border-bg-border/60">
                    <td className="px-3 py-2 text-gray-400">{formatDateTime(r.created_at)}</td>
                    <td className="px-3 py-2 text-gray-300">{String(r.properties?.platform ?? '—')}</td>
                    <td className="px-3 py-2 text-gray-400">{r.user_id ? r.user_id.slice(0, 8) : 'Anônimo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
