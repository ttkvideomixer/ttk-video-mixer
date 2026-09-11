'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import ReasonModal from '@/components/admin/ReasonModal'
import AdminModalShell from '@/components/admin/AdminModalShell'
import type { AdminUserDetail } from '@/types/adminUserDetail'

type ModalKind = 'block' | 'unblock' | 'grant' | 'trial_bonus' | 'reset_trial' | 'delete' | null

const BLOCK_REASONS = ['Fraude', 'Chargeback', 'Abuso de trial', 'Violação dos termos', 'Solicitação do usuário', 'Outro']
const GRANT_DURATIONS = [
  { label: '1 dia', days: 1 },
  { label: '3 dias', days: 3 },
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: '90 dias', days: 90 }
]

export default function UserActionsPanel({ userId, detail, onChanged }: { userId: string; detail: AdminUserDetail; onChanged: () => void }): JSX.Element {
  const { push } = useToast()
  const [modal, setModal] = useState<ModalKind>(null)
  const [grantDays, setGrantDays] = useState<number | 'custom'>(7)
  const [grantType, setGrantType] = useState('support')
  const [customEnd, setCustomEnd] = useState('')
  const [bonusCredits, setBonusCredits] = useState(27)

  const isBlocked = Boolean(detail.overview.blocked_at)

  const runAction = async (body: Record<string, unknown>, successMessage: string): Promise<void> => {
    const response = await fetch(`/api/admin/users/${userId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json.message ?? 'Falha na ação.')
    push('success', successMessage)
    onChanged()
  }

  const handleGrantAccess = async (reason: string): Promise<void> => {
    const startAt = new Date()
    const endAt =
      grantDays === 'custom' && customEnd
        ? new Date(customEnd)
        : new Date(startAt.getTime() + (typeof grantDays === 'number' ? grantDays : 7) * 24 * 60 * 60 * 1000)
    try {
      await runAction(
        { type: 'grant_access', grantType, startAt: startAt.toISOString(), endAt: endAt.toISOString(), reason },
        'Bônus de acesso concedido.'
      )
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Falha ao conceder acesso.')
      throw err
    }
  }

  const handleTrialBonus = async (reason: string): Promise<void> => {
    try {
      await runAction({ type: 'trial_bonus', credits: bonusCredits, reason }, `+${bonusCredits} créditos de trial concedidos.`)
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Falha ao conceder créditos.')
      throw err
    }
  }

  const quickAction = async (body: Record<string, unknown>, successMessage: string): Promise<void> => {
    try {
      await runAction(body, successMessage)
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Falha na ação.')
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isBlocked ? (
        <button onClick={() => setModal('unblock')} className="rounded-lg border border-success/40 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10">
          Desbloquear
        </button>
      ) : (
        <button onClick={() => setModal('block')} className="rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10">
          Bloquear Usuário
        </button>
      )}
      <button onClick={() => setModal('grant')} className="rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand-light hover:bg-brand/10">
        Conceder Acesso
      </button>
      <button onClick={() => setModal('trial_bonus')} className="rounded-lg border border-bg-border px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-bg-soft">
        Adicionar Bônus de Trial
      </button>
      <button
        onClick={() => quickAction({ type: 'reset_trial', reason: 'Reset manual pelo admin' }, 'Trial resetado.')}
        className="rounded-lg border border-bg-border px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
      >
        Resetar Trial
      </button>
      <button
        onClick={() => quickAction({ type: 'logout_all', reason: 'Logout forçado pelo admin' }, 'Sessões e dispositivos revogados.')}
        className="rounded-lg border border-bg-border px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
      >
        Deslogar em Todos os Dispositivos
      </button>
      <button onClick={() => setModal('delete')} className="rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10">
        Excluir Conta
      </button>

      {modal === 'block' && (
        <ReasonModal
          title="Bloquear Usuário"
          description="O usuário perde acesso imediato a novas gerações. A assinatura não é cancelada automaticamente."
          confirmLabel="Confirmar Bloqueio"
          reasonOptions={BLOCK_REASONS}
          onConfirm={(reason) => runAction({ type: 'block', reason }, 'Usuário bloqueado.')}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'unblock' && (
        <ReasonModal
          title="Desbloquear Usuário"
          confirmLabel="Confirmar Desbloqueio"
          onConfirm={(reason) => runAction({ type: 'unblock', reason }, 'Usuário desbloqueado.')}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'delete' && (
        <ReasonModal
          title="Excluir Conta"
          description="Isso desativa a conta (soft delete) e bloqueia o acesso. Registros financeiros são preservados."
          confirmLabel="Excluir Conta"
          requireTypedConfirmation="EXCLUIR"
          onConfirm={(reason) => runAction({ type: 'delete', reason }, 'Conta excluída.')}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'grant' && (
        <AdminModalShell title="Conceder Acesso Gratuito" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1 text-xs text-gray-400">Tipo</p>
              <select value={grantType} onChange={(e) => setGrantType(e.target.value)} className="w-full rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-white">
                {['promo', 'support', 'influencer', 'partner', 'compensation', 'manual'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-400">Duração</p>
              <div className="flex flex-wrap gap-2">
                {GRANT_DURATIONS.map((d) => (
                  <button
                    key={d.days}
                    onClick={() => setGrantDays(d.days)}
                    className={`rounded-md border px-2.5 py-1 text-xs ${grantDays === d.days ? 'border-brand bg-brand/10 text-brand-light' : 'border-bg-border text-gray-400'}`}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  onClick={() => setGrantDays('custom')}
                  className={`rounded-md border px-2.5 py-1 text-xs ${grantDays === 'custom' ? 'border-brand bg-brand/10 text-brand-light' : 'border-bg-border text-gray-400'}`}
                >
                  Personalizado
                </button>
              </div>
              {grantDays === 'custom' && (
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="mt-2 rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-white" />
              )}
            </div>
            <InlineReasonForm onConfirm={handleGrantAccess} confirmLabel="Conceder Acesso" onClose={() => setModal(null)} />
          </div>
        </AdminModalShell>
      )}

      {modal === 'trial_bonus' && (
        <AdminModalShell title="Adicionar Créditos de Trial" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {[10, 27, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setBonusCredits(n)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${bonusCredits === n ? 'border-brand bg-brand/10 text-brand-light' : 'border-bg-border text-gray-400'}`}
                >
                  +{n}
                </button>
              ))}
              <input
                type="number"
                min={1}
                value={bonusCredits}
                onChange={(e) => setBonusCredits(Number(e.target.value))}
                className="w-24 rounded-md border border-bg-border bg-bg-soft px-2 py-1.5 text-sm text-white"
              />
            </div>
            <InlineReasonForm onConfirm={handleTrialBonus} confirmLabel="Adicionar Créditos" onClose={() => setModal(null)} />
          </div>
        </AdminModalShell>
      )}
    </div>
  )
}

function InlineReasonForm({ onConfirm, confirmLabel, onClose }: { onConfirm: (reason: string) => Promise<void>; confirmLabel: string; onClose: () => void }): JSX.Element {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (): Promise<void> => {
    setBusy(true)
    try {
      await onConfirm(reason)
      onClose()
    } catch {
      // toast already shown by caller
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (obrigatório)"
        rows={2}
        className="w-full resize-none rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white placeholder:text-gray-500"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={reason.trim().length < 3 || busy} className="rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-black disabled:opacity-40">
          {busy ? 'Aguarde...' : confirmLabel}
        </button>
      </div>
    </div>
  )
}
