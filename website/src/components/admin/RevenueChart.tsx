'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { RevenueTimeseriesPoint } from '@/types/dashboard'
import { formatCents } from '@/lib/admin/format'

export default function RevenueChart({ data }: { data: RevenueTimeseriesPoint[] }): JSX.Element {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-500">Sem receita neste período.</div>
  }

  const chartData = data.map((point) => ({
    ...point,
    grossReais: point.gross / 100,
    refundsReais: point.refunds / 100
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c5cff" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#7c5cff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#242639" />
        <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => `R$${v}`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#151822', border: '1px solid #242639', borderRadius: 8 }}
          labelStyle={{ color: '#f5f5f7' }}
          formatter={(value: number) => formatCents(value * 100)}
        />
        <Area type="monotone" dataKey="grossReais" name="Receita bruta" stroke="#7c5cff" fill="url(#grossGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
