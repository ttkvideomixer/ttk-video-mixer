'use client'

import { useCallback, useEffect, useState } from 'react'
import PeriodFilterBar from '@/components/admin/PeriodFilterBar'
import type { PeriodPreset } from '@/lib/admin/periods'

interface Row {
  source: string
  signups: number
  downloads: number
}

export default function AcquisitionPage(): JSX.Element {
  const [preset, setPreset] = useState<PeriodPreset>('last30')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/admin/acquisition?period=${preset}`)
    const json = await response.json()
    setRows(json.rows ?? [])
    setLoading(false)
  }, [preset])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-white">Aquisição</h1>
      <PeriodFilterBar value={preset} onChange={setPreset} compare={false} onCompareChange={() => undefined} />

      <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Fonte (utm_source)</th>
              <th className="px-3 py-2">Cadastros</th>
              <th className="px-3 py-2">Downloads</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rows.map((row) => (
                <tr key={row.source} className="border-b border-bg-border/60">
                  <td className="px-3 py-2 text-gray-200">{row.source}</td>
                  <td className="px-3 py-2 text-gray-400">{row.signups}</td>
                  <td className="px-3 py-2 text-gray-400">{row.downloads}</td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                  Sem dados de aquisição neste período ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
