'use client'

import { useCallback, useEffect, useState } from 'react'
import Pagination from '@/components/admin/Pagination'
import { formatDateTime } from '@/lib/admin/format'

interface Entry {
  id: string
  admin_user_id: string
  action_type: string
  target_user_id: string | null
  reason: string | null
  created_at: string
}

const ACTION_TYPES = [
  'USER_BLOCKED',
  'USER_UNBLOCKED',
  'TRIAL_RESET',
  'BONUS_GRANTED',
  'BONUS_REMOVED',
  'SUBSCRIPTION_OVERRIDE',
  'DEVICE_REVOKED',
  'USER_NOTE_CREATED',
  'USER_NOTE_UPDATED',
  'USER_DELETED',
  'REFUND_REQUESTED',
  'ADMIN_ROLE_CHANGED'
]

export default function AuditPage(): JSX.Element {
  const [actionType, setActionType] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) })
    if (actionType) params.set('actionType', actionType)
    const response = await fetch(`/api/admin/audit?${params.toString()}`)
    const json = await response.json()
    setRows(json.rows ?? [])
    setTotal(json.total ?? 0)
  }, [actionType, page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-white">Audit Log</h1>

      <select value={actionType} onChange={(e) => { setPage(1); setActionType(e.target.value) }} className="w-fit rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
        <option value="">Todas as ações</option>
        {ACTION_TYPES.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Alvo</th>
              <th className="px-3 py-2">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id} className="border-b border-bg-border/60">
                <td className="px-3 py-2 text-gray-400">{formatDateTime(entry.created_at)}</td>
                <td className="px-3 py-2 font-mono text-xs text-brand-light">{entry.action_type}</td>
                <td className="px-3 py-2 text-gray-500">{entry.admin_user_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-gray-500">{entry.target_user_id?.slice(0, 8) ?? '—'}</td>
                <td className="px-3 py-2 text-gray-400">{entry.reason ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  Nenhuma ação registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-3 pb-3">
          <Pagination page={page} pageSize={50} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
