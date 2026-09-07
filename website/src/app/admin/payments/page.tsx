'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/admin/StatusBadge'
import Pagination from '@/components/admin/Pagination'
import ReasonModal from '@/components/admin/ReasonModal'
import { useToast } from '@/components/ui/Toast'
import { formatCents, formatDateTime } from '@/lib/admin/format'

interface Row {
  id: string
  user_id: string
  provider_event: string
  status: string | null
  amount_cents: number | null
  created_at: string
}

const STATUS_OPTIONS = ['paid', 'pending', 'failed', 'refunded']

export default function PaymentsPage(): JSX.Element {
  const { push } = useToast()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refundTarget, setRefundTarget] = useState<Row | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    const response = await fetch(`/api/admin/payments?${params.toString()}`)
    const json = await response.json()
    setRows(json.rows ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [status, page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Pagamentos</h1>
        <a href="/api/admin/payments?format=csv" className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
          Exportar CSV
        </a>
      </div>

      <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }} className="w-fit rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
        <option value="">Todos os status</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Evento</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-b border-bg-border/60 hover:bg-bg-soft">
                  <td className="px-3 py-2 text-gray-400">{formatDateTime(row.created_at)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${row.user_id}`} className="text-brand-light hover:underline">
                      {row.user_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{row.provider_event}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status ?? undefined} />
                  </td>
                  <td className="px-3 py-2 text-gray-400">{formatCents(row.amount_cents)}</td>
                  <td className="px-3 py-2">
                    {row.status === 'paid' && (
                      <button onClick={() => setRefundTarget(row)} className="text-xs text-error hover:underline">
                        Reembolsar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Nenhum pagamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-3 pb-3">
          <Pagination page={page} pageSize={25} total={total} onPageChange={setPage} />
        </div>
      </div>

      {refundTarget && (
        <ReasonModal
          title="Reembolsar Pagamento"
          description={`Valor: ${formatCents(refundTarget.amount_cents)}. Isso consulta a Pagar.me diretamente — nunca é um reembolso apenas local.`}
          confirmLabel="Confirmar Reembolso"
          requireTypedConfirmation="REEMBOLSAR"
          onConfirm={async (reason) => {
            const response = await fetch(`/api/admin/payments/${refundTarget.id}/refund`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason })
            })
            const json = await response.json()
            if (!response.ok) throw new Error(json.message)
            push('success', 'Reembolso solicitado.')
            load()
          }}
          onClose={() => setRefundTarget(null)}
        />
      )}
    </div>
  )
}
