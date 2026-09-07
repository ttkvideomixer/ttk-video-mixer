'use client'

import { useEffect, useState } from 'react'
import { useAdminMe } from '@/components/admin/AdminGate'
import { useToast } from '@/components/ui/Toast'
import { ADMIN_ROLE_LABELS, type AdminRole } from '@/types/admin'

interface Row {
  id: string
  public_user_id: string
  display_name: string | null
  email: string
  role: AdminRole
  created_at: string
}

export default function AdminsPage(): JSX.Element {
  const me = useAdminMe()
  const { push } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'support' | 'admin'>('support')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const canManage = me.role === 'admin' || me.role === 'super_admin'

  const load = async (): Promise<void> => {
    const response = await fetch('/api/admin/admins')
    const json = await response.json()
    setRows(json.rows ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const invite = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, reason })
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message ?? 'Falha ao promover usuário.')
      push('success', `${email} agora é ${ADMIN_ROLE_LABELS[role]}.`)
      setEmail('')
      setReason('')
      load()
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-white">Admins</h1>

      {canManage && (
        <form onSubmit={invite} className="flex flex-col gap-3 rounded-2xl border border-bg-border bg-bg-card p-5 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-400">E-mail (conta já deve existir)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Cargo</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'support' | 'admin')} className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white">
              <option value="support">Suporte</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-400">Motivo</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white" />
          </div>
          <button type="submit" disabled={busy} className="rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Aguarde...' : 'Promover'}
          </button>
        </form>
      )}
      {!canManage && <p className="text-sm text-gray-500">Apenas admins e super admins podem promover contas.</p>}
      <p className="text-xs text-gray-500">
        super_admin não pode ser criado por aqui — apenas via <code className="rounded bg-bg-soft px-1">npm run admin:promote</code> localmente.
      </p>

      <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">ID TTK</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Cargo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-bg-border/60">
                <td className="px-3 py-2 font-mono text-xs text-gray-400">{row.public_user_id}</td>
                <td className="px-3 py-2 text-gray-200">{row.display_name ?? '—'}</td>
                <td className="px-3 py-2 text-gray-400">{row.email}</td>
                <td className="px-3 py-2 text-brand-light">{ADMIN_ROLE_LABELS[row.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
