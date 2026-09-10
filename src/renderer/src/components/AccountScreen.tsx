import { useEffect, useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import { useAuthStore } from '../state/useAuthStore'
import ModalShell from './ModalShell'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'Teste grátis',
  active: 'Pro ativo',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelado (ativo até o fim do período)',
  expired: 'Expirado',
  suspended: 'Suspenso'
}

function AccountScreen(): JSX.Element {
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const closeModal = useAppStore((s) => s.closeModal)
  const user = useAuthStore((s) => s.user)
  const entitlement = useAuthStore((s) => s.entitlement)
  const devices = useAuthStore((s) => s.devices)
  const deviceId = useAuthStore((s) => s.deviceId)
  const refreshEntitlement = useAuthStore((s) => s.refreshEntitlement)
  const refreshDevices = useAuthStore((s) => s.refreshDevices)
  const revokeDevice = useAuthStore((s) => s.revokeDevice)
  const signOut = useAuthStore((s) => s.signOut)

  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    refreshEntitlement()
    refreshDevices()
    window.api.getAppVersion().then(setAppVersion)
  }, [refreshEntitlement, refreshDevices])

  const runAction = async (key: string, fn: () => Promise<void>): Promise<void> => {
    setBusyAction(key)
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleReconcile = (): Promise<void> =>
    runAction('reconcile', async () => {
      await window.api.reconcileSubscription()
      await refreshEntitlement()
    })

  const handleCancel = (): Promise<void> =>
    runAction('cancel', async () => {
      await window.api.cancelSubscription()
      await refreshEntitlement()
    })

  const handleReactivate = (): Promise<void> =>
    runAction('reactivate', async () => {
      await window.api.reactivateSubscription()
      await refreshEntitlement()
    })

  const handleDeleteAccount = (): Promise<void> =>
    runAction('delete', async () => {
      await window.api.deleteAccount()
      await signOut()
      closeModal()
    })

  const isPro = entitlement?.plan === 'pro'
  const statusLabel = entitlement ? (STATUS_LABELS[entitlement.status] ?? entitlement.status) : '—'

  return (
    <ModalShell title="Minha Conta" onClose={closeModal}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-white">{user?.email ?? '—'}</p>
          {appVersion && <p className="mt-0.5 text-[11px] text-gray-500">Versão {appVersion}</p>}
        </div>

        <div className="rounded-xl border border-bg-border bg-bg-soft p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Plano</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                isPro ? 'bg-brand text-white' : 'bg-bg-border text-gray-300'
              }`}
            >
              {isPro ? 'Pro' : 'Grátis'}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-300">{statusLabel}</p>
          {entitlement && entitlement.plan === 'free' && (
            <p className="mt-1 text-xs text-gray-500">
              Teste grátis: {entitlement.trialUsed} / {entitlement.trialTotal} vídeos utilizados
            </p>
          )}
          {entitlement?.currentPeriodEnd && (
            <p className="mt-1 text-xs text-gray-500">
              {entitlement.cancelAtPeriodEnd ? 'Acesso Pro até' : 'Renova em'} {formatDate(entitlement.currentPeriodEnd)}
            </p>
          )}

          {actionError && <p className="mt-2 text-xs text-error">{actionError}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleReconcile}
              disabled={busyAction !== null}
              className="rounded-lg border border-bg-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-border disabled:opacity-50"
            >
              {busyAction === 'reconcile' ? 'Atualizando...' : 'Atualizar Status'}
            </button>
            {isPro && !entitlement?.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                disabled={busyAction !== null}
                className="rounded-lg border border-error/50 px-3 py-1.5 text-xs text-error hover:bg-error/10 disabled:opacity-50"
              >
                {busyAction === 'cancel' ? 'Cancelando...' : 'Cancelar Assinatura'}
              </button>
            )}
            {isPro && entitlement?.cancelAtPeriodEnd && (
              <button
                onClick={handleReactivate}
                disabled={busyAction !== null}
                className="rounded-lg border border-brand px-3 py-1.5 text-xs text-brand-light hover:bg-brand/10 disabled:opacity-50"
              >
                {busyAction === 'reactivate' ? 'Reativando...' : 'Reativar Assinatura'}
              </button>
            )}
          </div>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Dispositivos</span>
          <div className="mt-2 flex flex-col gap-2">
            {devices.length === 0 && <p className="text-xs text-gray-500">Nenhum dispositivo registrado.</p>}
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-bg-border bg-bg-soft px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold text-gray-200">
                    {d.device_name ?? 'Dispositivo'} {d.id === deviceId && <span className="text-brand-light">(este)</span>}
                  </p>
                  <p className="text-[11px] text-gray-500">Visto pela última vez em {formatDate(d.last_seen_at)}</p>
                </div>
                {!d.revoked_at && d.id !== deviceId && (
                  <button
                    onClick={() => revokeDevice(d.id)}
                    className="rounded-md border border-bg-border px-2 py-1 text-[11px] text-gray-400 hover:bg-bg-border"
                  >
                    Remover
                  </button>
                )}
                {d.revoked_at && <span className="text-[11px] text-gray-600">Removido</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-bg-border pt-4">
          <button
            onClick={() => {
              signOut()
              closeModal()
            }}
            className="rounded-lg border border-bg-border px-4 py-2 text-xs text-gray-300 hover:bg-bg-soft"
          >
            Sair da conta
          </button>

          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-error hover:underline">
              Excluir minha conta
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Tem certeza?</span>
              <button
                onClick={handleDeleteAccount}
                disabled={busyAction !== null}
                className="rounded-md bg-error px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {busyAction === 'delete' ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-300">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

export default AccountScreen
