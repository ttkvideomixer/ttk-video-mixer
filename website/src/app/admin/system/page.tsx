'use client'

import { useEffect, useState } from 'react'

interface HealthCheck {
  ok: boolean
  detail?: string
}

interface SystemResponse {
  website: { ok: boolean }
  backendError: string | null
  backendChecks: Record<string, HealthCheck>
}

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-bg-border/60 py-2 text-sm">
      <span className="text-gray-300">{label}</span>
      <span className={`flex items-center gap-2 ${ok ? 'text-success' : 'text-error'}`}>
        <span className={`h-2 w-2 rounded-full ${ok ? 'bg-success' : 'bg-error'}`} />
        {ok ? 'OK' : detail ?? 'Falhou'}
      </span>
    </div>
  )
}

export default function SystemPage(): JSX.Element {
  const [data, setData] = useState<SystemResponse | null>(null)

  const load = async (): Promise<void> => {
    const response = await fetch('/api/admin/system')
    setData(await response.json())
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Saúde do Sistema</h1>
        <button onClick={load} className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
          Atualizar
        </button>
      </div>

      {data && (
        <div className="rounded-2xl border border-bg-border bg-bg-card p-5">
          <Row label="Website (Supabase configurado)" ok={data.website.ok} />
          {data.backendError ? (
            <Row label="Backend (Edge Functions)" ok={false} detail={data.backendError} />
          ) : (
            Object.entries(data.backendChecks).map(([key, value]) => <Row key={key} label={key} ok={value.ok} detail={value.detail} />)
          )}
        </div>
      )}
      <p className="text-xs text-gray-500">Nenhuma chave secreta é exibida aqui — apenas se está configurada ou não.</p>
    </div>
  )
}
