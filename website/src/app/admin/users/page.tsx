'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import StatusBadge from '@/components/admin/StatusBadge'
import Pagination from '@/components/admin/Pagination'
import { formatCents, formatDate, formatDateTime } from '@/lib/admin/format'
import type { AdminUserOverview } from '@/types/adminUser'

const STATUS_OPTIONS = ['trial', 'active', 'past_due', 'canceled', 'expired', 'suspended']
const PLAN_OPTIONS = ['free', 'pro']
const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Mais recente' },
  { value: 'created_asc', label: 'Mais antigo' },
  { value: 'revenue_desc', label: 'Maior receita' },
  { value: 'videos_desc', label: 'Mais vídeos gerados' },
  { value: 'period_end_asc', label: 'Vencimento mais próximo' }
]

export default function AdminUsersPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Carregando...</div>}>
      <AdminUsersContent />
    </Suspense>
  )
}

function AdminUsersContent(): JSX.Element {
  const searchParams = useSearchParams()

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [blocked, setBlocked] = useState('')
  const [hasGrant, setHasGrant] = useState('')
  const [trialExhausted, setTrialExhausted] = useState(searchParams.get('trialExhausted') === '1')
  const [sort, setSort] = useState('created_desc')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<AdminUserOverview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const buildParams = useCallback(
    (format?: string) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (plan) params.set('plan', plan)
      if (status) params.set('status', status)
      if (blocked) params.set('blocked', blocked)
      if (hasGrant) params.set('hasGrant', hasGrant)
      if (trialExhausted) params.set('trialExhausted', '1')
      params.set('sort', sort)
      params.set('page', String(page))
      if (format) params.set('format', format)
      return params
    },
    [q, plan, status, blocked, hasGrant, trialExhausted, sort, page]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users?${buildParams().toString()}`)
      const json = await response.json()
      setRows(json.rows ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Usuários</h1>
        <a href={`/api/admin/users?${buildParams('csv').toString()}`} className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-soft">
          Exportar CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bg-border bg-bg-card p-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
          placeholder="Nome, email, ID TTK, TikTok..."
          className="w-56 rounded-md border border-bg-border bg-bg-soft px-3 py-1.5 text-sm text-white placeholder:text-gray-500"
        />
        <select value={plan} onChange={(e) => { setPage(1); setPlan(e.target.value) }} className="rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
          <option value="">Todos os planos</option>
          {PLAN_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p === 'free' ? 'Grátis' : 'Pro'}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }} className="rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={blocked} onChange={(e) => { setPage(1); setBlocked(e.target.value) }} className="rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
          <option value="">Bloqueio: todos</option>
          <option value="1">Bloqueados</option>
          <option value="0">Não bloqueados</option>
        </select>
        <select value={hasGrant} onChange={(e) => { setPage(1); setHasGrant(e.target.value) }} className="rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
          <option value="">Bônus: todos</option>
          <option value="1">Com bônus ativo</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          <input type="checkbox" checked={trialExhausted} onChange={(e) => { setPage(1); setTrialExhausted(e.target.checked) }} className="accent-brand" />
          Trial esgotado
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-gray-300">
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">ID TTK</th>
              <th className="px-3 py-2">Nome / Email</th>
              <th className="px-3 py-2">Plano</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Trial</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2">Dispositivos</th>
              <th className="px-3 py-2">Vídeos</th>
              <th className="px-3 py-2">Receita</th>
              <th className="px-3 py-2">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={10} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-bg-soft" />
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                  Nenhum usuário encontrado com esses filtros.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.user_id} className="border-b border-bg-border/60 hover:bg-bg-soft">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${row.user_id}`} className="font-mono text-xs text-brand-light hover:underline">
                      {row.public_user_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-gray-200">{row.display_name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{row.plan === 'pro' ? 'Pro' : 'Grátis'}</td>
                  <td className="px-3 py-2">
                    {row.blocked_at ? <StatusBadge status="blocked" /> : <StatusBadge status={row.status} />}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {row.trial_used}/{row.trial_total}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{formatDate(row.current_period_end)}</td>
                  <td className="px-3 py-2 text-gray-400">{row.active_device_count}</td>
                  <td className="px-3 py-2 text-gray-400">{row.videos_generated}</td>
                  <td className="px-3 py-2 text-gray-400">{formatCents(row.lifetime_revenue_cents)}</td>
                  <td className="px-3 py-2 text-gray-500" title={formatDateTime(row.created_at)}>
                    {formatDate(row.created_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="px-3 pb-3">
          <Pagination page={page} pageSize={25} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
