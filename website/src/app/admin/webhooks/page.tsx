'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/admin/format'

interface Row {
  provider_event_id: string
  event_type: string
  received_at: string
  processed_at: string | null
  last_error: string | null
}

export default function WebhooksPage(): JSX.Element {
  const { push } = useToast()
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [rows, setRows] = useState<Row[]>([])

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webhooks?errors=${onlyErrors ? '1' : '0'}`)
    const json = await response.json()
    setRows(json.rows ?? [])
  }, [onlyErrors])

  useEffect(() => {
    load()
  }, [load])

  const reprocess = async (id: string): Promise<void> => {
    const response = await fetch(`/api/admin/webhooks/${id}/reprocess`, { method: 'POST' })
    const json = await response.json()
    if (!response.ok) {
      push('error', json.message ?? 'Falha ao reprocessar.')
      return
    }
    push('success', 'Evento reprocessado.')
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-white">Webhooks (Pagar.me)</h1>

      <label className="flex w-fit items-center gap-2 text-xs text-gray-400">
        <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} className="accent-brand" />
        Mostrar apenas com erro
      </label>

      <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Recebido</th>
              <th className="px-3 py-2">Evento</th>
              <th className="px-3 py-2">Processado</th>
              <th className="px-3 py-2">Erro</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.provider_event_id} className="border-b border-bg-border/60">
                <td className="px-3 py-2 text-gray-400">{formatDateTime(row.received_at)}</td>
                <td className="px-3 py-2 text-gray-300">{row.event_type}</td>
                <td className="px-3 py-2 text-gray-400">{row.processed_at ? formatDateTime(row.processed_at) : '—'}</td>
                <td className="px-3 py-2 text-error">{row.last_error ?? '—'}</td>
                <td className="px-3 py-2">
                  {row.last_error && (
                    <button onClick={() => reprocess(row.provider_event_id)} className="text-xs text-brand-light hover:underline">
                      Reprocessar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  Nenhum evento de webhook ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
