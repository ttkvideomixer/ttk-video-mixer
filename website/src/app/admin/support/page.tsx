'use client'

import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDateTime } from '@/lib/admin/format'

interface Ticket {
  id: string
  user_id: string | null
  email: string
  subject: string
  message: string
  platform: string | null
  app_version: string | null
  status: string
  created_at: string
}

const STATUS_OPTIONS = ['open', 'in_progress', 'closed']

export default function SupportPage(): JSX.Element {
  const [status, setStatus] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const response = await fetch(`/api/admin/support?${params.toString()}`)
    const json = await response.json()
    setTickets(json.rows ?? [])
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const updateStatus = async (id: string, newStatus: string): Promise<void> => {
    await fetch(`/api/admin/support/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-white">Suporte</h1>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-fit rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
        <option value="">Todos os status</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-xl border border-bg-border bg-bg-card p-4">
            <button onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)} className="flex w-full items-center justify-between text-left">
              <div>
                <p className="text-sm font-semibold text-gray-200">{ticket.subject}</p>
                <p className="text-xs text-gray-500">
                  {ticket.email} · {formatDateTime(ticket.created_at)} {ticket.platform && `· ${ticket.platform}`}
                </p>
              </div>
              <StatusBadge status={ticket.status} />
            </button>
            {expanded === ticket.id && (
              <div className="mt-3 border-t border-bg-border pt-3">
                <p className="whitespace-pre-line text-sm text-gray-300">{ticket.message}</p>
                <div className="mt-3 flex gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(ticket.id, s)}
                      disabled={ticket.status === s}
                      className="rounded-md border border-bg-border px-2.5 py-1 text-xs text-gray-300 hover:bg-bg-soft disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && <p className="text-sm text-gray-500">Nenhum ticket encontrado.</p>}
      </div>
    </div>
  )
}
