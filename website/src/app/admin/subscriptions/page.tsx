'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import StatusBadge from '@/components/admin/StatusBadge'
import Pagination from '@/components/admin/Pagination'
import ReasonModal from '@/components/admin/ReasonModal'
import { useToast } from '@/components/ui/Toast'
import { formatCents, formatDate } from '@/lib/admin/format'

interface Row {
  id: string
  user_id: string
  payment_type: string
  status: string
  amount_cents: number
  period_start: string | null
  period_end: string | null
  cancel_at_period_end: boolean
}

const STATUS_OPTIONS = ['pending', 'active', 'past_due', 'canceled', 'failed', 'expired']

function SubscriptionsContent(): JSX.Element {
  const searchParams = useSearchParams()
  const { push } = useToast()
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    const response = await fetch(`/api/admin/subscriptions?${params.toString()}`)
    const json = await response.json()
    setRows(json.rows ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [status, page])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (id: string, type: 'reactivate' | 'reconcile', reason?: string): Promise<void> => {
    const response = await fetch(`/api/admin/subscriptions/${id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'reactivate' ? { type, reason } : { type })
    })
    const json = await response.json()
    if (!response.ok) {
      push('error', json.message ?? 'Falha na ação.')
      return
    }
    push('success', json.note ?? 'Ação concluída.')
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Assinaturas</h1>
        <a href="/api/admin/subscriptions?format=csv" className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
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
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Método</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-b border-bg-border/60 hover:bg-bg-soft">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${row.user_id}`} className="text-brand-light hover:underline">
                      {row.user_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{row.payment_type}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 text-gray-400">{formatCents(row.amount_cents)}</td>
                  <td className="px-3 py-2 text-gray-400">{formatDate(row.period_end)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {row.status !== 'canceled' && (
                        <button onClick={() => setCancelTarget(row)} className="text-xs text-error hover:underline">
                          Cancelar
                        </button>
                      )}
                      {row.cancel_at_period_end && (
                        <button onClick={() => handleAction(row.id, 'reactivate', 'Reativado pelo admin')} className="text-xs text-brand-light hover:underline">
                          Reativar
                        </button>
                      )}
                      <button onClick={() => handleAction(row.id, 'reconcile')} className="text-xs text-gray-400 hover:underline">
                        Reconciliar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Nenhuma assinatura encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-3 pb-3">
          <Pagination page={page} pageSize={25} total={total} onPageChange={setPage} />
        </div>
      </div>

      {cancelTarget && (
        <ReasonModal
          title="Cancelar Assinatura"
          description="Escolha cancelar no fim do período atual ou imediatamente. Isso sincroniza com a Pagar.me antes de atualizar o banco."
          confirmLabel="Cancelar no fim do período"
          onConfirm={async (reason) => {
            const response = await fetch(`/api/admin/subscriptions/${cancelTarget.id}/actions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'cancel', immediately: false, reason })
            })
            const json = await response.json()
            if (!response.ok) throw new Error(json.message)
            push('success', 'Cancelamento agendado para o fim do período.')
            load()
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}

export default function SubscriptionsPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Carregando...</div>}>
      <SubscriptionsContent />
    </Suspense>
  )
}
