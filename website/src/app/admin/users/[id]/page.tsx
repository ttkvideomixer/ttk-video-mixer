'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatCents, formatDate, formatDateTime } from '@/lib/admin/format'
import { useToast } from '@/components/ui/Toast'
import UserActionsPanel from '@/components/admin/userDetail/UserActionsPanel'
import type { AdminUserDetail } from '@/types/adminUserDetail'

const TABS = ['Visão Geral', 'Assinatura', 'Pagamentos', 'Uso', 'Dispositivos', 'Quiz', 'Notas', 'Audit'] as const
type Tab = (typeof TABS)[number]

export default function AdminUserDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>()
  const userId = params.id
  const { push } = useToast()

  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Visão Geral')
  const [newTag, setNewTag] = useState('')
  const [newNote, setNewNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) throw new Error('Não foi possível carregar este usuário.')
      setDetail(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const addTag = async (): Promise<void> => {
    if (!newTag.trim()) return
    await fetch(`/api/admin/users/${userId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'add_tag', tag: newTag.trim() })
    })
    setNewTag('')
    load()
  }

  const removeTag = async (tag: string): Promise<void> => {
    await fetch(`/api/admin/users/${userId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'remove_tag', tag })
    })
    load()
  }

  const addNote = async (): Promise<void> => {
    if (!newNote.trim()) return
    const response = await fetch(`/api/admin/users/${userId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'add_note', note: newNote.trim() })
    })
    if (response.ok) {
      push('success', 'Nota adicionada.')
      setNewNote('')
      load()
    }
  }

  const revokeDevice = async (deviceId: string): Promise<void> => {
    const reason = 'Revogado manualmente pelo admin'
    await fetch(`/api/admin/users/${userId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'revoke_device', deviceId, reason })
    })
    load()
  }

  if (loading && !detail) return <p className="text-sm text-gray-500">Carregando...</p>
  if (error) return <p className="text-sm text-error">{error}</p>
  if (!detail) return <p className="text-sm text-gray-500">Usuário não encontrado.</p>

  const { overview } = detail
  const badge = overview.blocked_at ? 'blocked' : overview.plan === 'pro' ? 'active' : overview.status

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-white">{overview.display_name ?? overview.email}</h1>
            <StatusBadge status={badge ?? undefined} />
          </div>
          <p className="mt-1 font-mono text-xs text-gray-500">{overview.public_user_id}</p>
          <p className="text-sm text-gray-400">
            {overview.email} {overview.tiktok_username && `· @${overview.tiktok_username}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detail.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-bg-soft px-2 py-0.5 text-[11px] text-gray-300">
                {tag}
                <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-error">
                  ×
                </button>
              </span>
            ))}
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="+ tag"
              className="w-20 rounded-full border border-dashed border-bg-border bg-transparent px-2 py-0.5 text-[11px] text-gray-400 placeholder:text-gray-600"
            />
          </div>
        </div>
        <UserActionsPanel userId={userId} detail={detail} onChanged={load} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Plano" value={overview.plan === 'pro' ? 'Pro' : 'Grátis'} />
        <SummaryCard label="Trial restante" value={`${Math.max(0, (overview.trial_total ?? 0) - (overview.trial_used ?? 0))}/${overview.trial_total ?? 0}`} />
        <SummaryCard label="Receita histórica" value={formatCents(overview.lifetime_revenue_cents)} />
        <SummaryCard label="Vídeos gerados" value={String(overview.videos_generated)} />
        <SummaryCard label="Dispositivos ativos" value={String(overview.active_device_count)} />
        <SummaryCard label="Cadastro" value={formatDate(overview.created_at)} />
        <SummaryCard label="Última geração" value={formatDate(overview.last_generation_at)} />
        <SummaryCard label="Onboarding" value={detail.onboarding?.completed_at ? 'Concluído' : 'Pendente'} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-bg-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t ? 'border-brand text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Visão Geral' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-bg-border bg-bg-card p-4">
            <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Bônus ativos</h3>
            {detail.grants.filter((g) => !g.revoked_at && new Date(g.end_at) > new Date()).length === 0 && (
              <p className="text-sm text-gray-500">Nenhum bônus ativo.</p>
            )}
            {detail.grants
              .filter((g) => !g.revoked_at && new Date(g.end_at) > new Date())
              .map((g) => (
                <div key={g.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-300">
                    {g.grant_type} até {formatDate(g.end_at)}
                  </span>
                  <button
                    onClick={async () => {
                      await fetch(`/api/admin/users/${userId}/actions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'revoke_grant', grantId: g.id, reason: 'Revogado pelo admin' })
                      })
                      load()
                    }}
                    className="text-xs text-error hover:underline"
                  >
                    Revogar
                  </button>
                </div>
              ))}
          </div>
          <div className="rounded-xl border border-bg-border bg-bg-card p-4">
            <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Flags de fraude</h3>
            {detail.fraudFlags.length === 0 && <p className="text-sm text-gray-500">Nenhuma flag.</p>}
            {detail.fraudFlags.map((f) => (
              <p key={f.id} className="text-sm text-gray-300">
                {f.flag_type} — {formatDate(f.created_at)}
              </p>
            ))}
          </div>
        </div>
      )}

      {tab === 'Assinatura' && (
        <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Início</th>
                <th className="px-3 py-2">Vencimento</th>
                <th className="px-3 py-2">Cancel. agendado</th>
              </tr>
            </thead>
            <tbody>
              {detail.subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-bg-border/60">
                  <td className="px-3 py-2 text-gray-300">{s.payment_type}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-3 py-2 text-gray-400">{formatDate(s.period_start)}</td>
                  <td className="px-3 py-2 text-gray-400">{formatDate(s.period_end)}</td>
                  <td className="px-3 py-2 text-gray-400">{s.cancel_at_period_end ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
              {detail.subscriptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    Sem assinaturas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Pagamentos' && (
        <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {detail.billingEvents.map((e) => (
                <tr key={e.id} className="border-b border-bg-border/60">
                  <td className="px-3 py-2 text-gray-400">{formatDateTime(e.created_at)}</td>
                  <td className="px-3 py-2 text-gray-300">{e.provider_event}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={e.status ?? undefined} />
                  </td>
                  <td className="px-3 py-2 text-gray-400">{formatCents(e.amount_cents)}</td>
                </tr>
              ))}
              {detail.billingEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    Sem pagamentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Uso' && (
        <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Outputs</th>
                <th className="px-3 py-2">Versão do app</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.generationBatches.map((b) => (
                <tr key={b.id} className="border-b border-bg-border/60">
                  <td className="px-3 py-2 text-gray-400">{formatDateTime(b.created_at)}</td>
                  <td className="px-3 py-2 text-gray-300">{b.count}</td>
                  <td className="px-3 py-2 text-gray-400">{b.app_version ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{b.status}</td>
                </tr>
              ))}
              {detail.generationBatches.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    Nenhuma geração ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Dispositivos' && (
        <div className="flex flex-col gap-2">
          {detail.devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-bg-border bg-bg-card p-3">
              <div>
                <p className="text-sm text-gray-200">{d.device_name ?? 'Dispositivo'}</p>
                <p className="text-xs text-gray-500">Visto pela última vez em {formatDateTime(d.last_seen_at)}</p>
              </div>
              {d.revoked_at ? (
                <span className="text-xs text-gray-600">Revogado</span>
              ) : (
                <button onClick={() => revokeDevice(d.id)} className="rounded-md border border-error/40 px-2.5 py-1 text-xs text-error hover:bg-error/10">
                  Revogar
                </button>
              )}
            </div>
          ))}
          {detail.devices.length === 0 && <p className="text-sm text-gray-500">Nenhum dispositivo registrado.</p>}
        </div>
      )}

      {tab === 'Quiz' && (
        <div className="rounded-xl border border-bg-border bg-bg-card p-4">
          {!detail.onboarding?.completed_at ? (
            <p className="text-sm text-gray-500">Onboarding não concluído.</p>
          ) : (
            <>
              <p className="text-sm font-bold text-white">Perfil: {detail.onboarding.profile_type}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400 md:grid-cols-4">
                <p>Volume: {detail.onboarding.score_volume}</p>
                <p>Consistência: {detail.onboarding.score_consistency}</p>
                <p>Variação: {detail.onboarding.score_variation}</p>
                <p>Automação: {detail.onboarding.score_automation}</p>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Notas' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Nova nota administrativa (nunca visível ao usuário)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
            <button onClick={addNote} className="rounded-lg bg-brand-gradient px-4 text-sm font-bold text-white">
              Adicionar
            </button>
          </div>
          {detail.notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-bg-border bg-bg-card p-3 text-sm text-gray-300">
              <p>{n.note}</p>
              <p className="mt-1 text-xs text-gray-500">{formatDateTime(n.created_at)}</p>
            </div>
          ))}
          {detail.notes.length === 0 && <p className="text-sm text-gray-500">Nenhuma nota ainda.</p>}
        </div>
      )}

      {tab === 'Audit' && (
        <div className="flex flex-col gap-2">
          {detail.auditLog.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-bg-border bg-bg-card p-3 text-sm">
              <p className="font-bold text-gray-200">{entry.action_type}</p>
              <p className="text-xs text-gray-500">
                {formatDateTime(entry.created_at)} {entry.reason && `· ${entry.reason}`}
              </p>
            </div>
          ))}
          {detail.auditLog.length === 0 && <p className="text-sm text-gray-500">Nenhuma ação registrada.</p>}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-3">
      <p className="text-[11px] uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
