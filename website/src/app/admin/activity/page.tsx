'use client'

import { useEffect, useState } from 'react'
import MetricCard from '@/components/admin/MetricCard'

interface ActivityResponse {
  dau: number
  wau: number
  mau: number
  usersNeverGenerated: number | null
}

export default function ActivityPage(): JSX.Element {
  const [data, setData] = useState<ActivityResponse | null>(null)

  useEffect(() => {
    fetch('/api/admin/activity')
      .then((r) => r.json())
      .then(setData)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">Atividade</h1>
        <p className="text-sm text-gray-400">Atividade definida como pelo menos um lote de geração autorizado no período.</p>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard label="DAU (1 dia)" formattedValue={String(data.dau)} />
          <MetricCard label="WAU (7 dias)" formattedValue={String(data.wau)} />
          <MetricCard label="MAU (30 dias)" formattedValue={String(data.mau)} />
          <MetricCard label="Nunca geraram" formattedValue={data.usersNeverGenerated !== null ? String(data.usersNeverGenerated) : '—'} href="/admin/users" />
        </div>
      )}
    </div>
  )
}
