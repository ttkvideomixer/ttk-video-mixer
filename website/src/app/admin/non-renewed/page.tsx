'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCents, formatDate } from '@/lib/admin/format'

interface Row {
  user_id: string
  public_user_id: string
  email: string
  payment_type: string
  last_period_end: string
  last_paid_at: string | null
  lifetime_payment_count: number
  lifetime_revenue_cents: number
  reason: string
}

const REASON_LABELS: Record<string, string> = {
  CANCELAMENTO: 'Cancelamento',
  PAGAMENTO_RECUSADO: 'Pagamento recusado',
  INADIMPLENCIA: 'Inadimplência',
  EXPIRADO: 'Expirado',
  PIX_NAO_RENOVADO: 'Pix não renovado'
}

export default function NonRenewedPage(): JSX.Element {
  const [rows, setRows] = useState<Row[]>([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (reason) params.set('reason', reason)
    const response = await fetch(`/api/admin/non-renewed?${params.toString()}`)
    const json = await response.json()
    setRows(json.rows ?? [])
    setLoading(false)
  }, [reason])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Não Renovaram</h1>
          <p className="text-sm text-gray-400">Usuários que já pagaram ao menos uma vez e não têm período ativo atual.</p>
        </div>
        <a href={`/api/admin/non-renewed?format=csv${reason ? `&reason=${reason}` : ''}`} className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
          Exportar CSV
        </a>
      </div>

      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-fit rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
        <option value="">Todos os motivos</option>
        {Object.entries(REASON_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Método</th>
              <th className="px-3 py-2">Motivo</th>
              <th className="px-3 py-2">Último pagamento</th>
              <th className="px-3 py-2">Pagamentos</th>
              <th className="px-3 py-2">Receita histórica</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Ninguém nessa condição no momento.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.user_id} className="border-b border-bg-border/60 hover:bg-bg-soft">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${row.user_id}`} className="text-brand-light hover:underline">
                      {row.public_user_id}
                    </Link>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{row.payment_type}</td>
                  <td className="px-3 py-2 text-warning">{REASON_LABELS[row.reason] ?? row.reason}</td>
                  <td className="px-3 py-2 text-gray-400">{formatDate(row.last_paid_at)}</td>
                  <td className="px-3 py-2 text-gray-400">{row.lifetime_payment_count}</td>
                  <td className="px-3 py-2 text-gray-400">{formatCents(row.lifetime_revenue_cents)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
