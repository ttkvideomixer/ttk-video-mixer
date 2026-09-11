import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import { useAuthStore } from '../state/useAuthStore'
import { billingErrorMessage, PIX_30_DAYS_PRICE_LABEL, PRO_MONTHLY_PRICE_LABEL } from '@shared/billing'
import { formatCpf, isValidCpf, sanitizeCpf } from '@shared/cpf'
import ModalShell from './ModalShell'

type CheckoutStatus = 'idle' | 'creating' | 'waiting' | 'paid' | 'error'

const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 5 * 60_000

function PaywallModal(): JSX.Element {
  const closeModal = useAppStore((s) => s.closeModal)
  const paywallReason = useAppStore((s) => s.paywallReason)
  const entitlement = useAuthStore((s) => s.entitlement)
  const refreshEntitlement = useAuthStore((s) => s.refreshEntitlement)

  const [status, setStatus] = useState<CheckoutStatus>('idle')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [cpf, setCpf] = useState('')
  const cpfValid = isValidCpf(cpf)
  const pollHandleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollDeadlineRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (pollHandleRef.current) clearInterval(pollHandleRef.current)
    }
  }, [])

  const startPolling = (): void => {
    setStatus('waiting')
    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS
    if (pollHandleRef.current) clearInterval(pollHandleRef.current)
    pollHandleRef.current = setInterval(async () => {
      await refreshEntitlement()
      const current = useAuthStore.getState().entitlement
      if (current && current.generationAllowed) {
        setStatus('paid')
        if (pollHandleRef.current) clearInterval(pollHandleRef.current)
        setTimeout(() => closeModal(), 1800)
        return
      }
      if (Date.now() > pollDeadlineRef.current) {
        if (pollHandleRef.current) clearInterval(pollHandleRef.current)
        setStatus('idle')
      }
    }, POLL_INTERVAL_MS)
  }

  const handleCardCheckout = async (): Promise<void> => {
    if (!cpfValid) {
      setCheckoutError('Informe um CPF válido para continuar.')
      return
    }
    setStatus('creating')
    setCheckoutError(null)
    try {
      const result = await window.api.createCardCheckout(sanitizeCpf(cpf))
      if (result.alreadySubscribed) {
        await refreshEntitlement()
        setStatus('paid')
        setTimeout(() => closeModal(), 1200)
        return
      }
      if (!result.checkoutUrl) throw new Error('Não foi possível gerar o link de pagamento.')
      window.open(result.checkoutUrl, '_blank')
      startPolling()
    } catch (err) {
      setStatus('error')
      setCheckoutError(err instanceof Error ? err.message : 'Não foi possível iniciar o pagamento.')
    }
  }

  const handlePixCheckout = async (): Promise<void> => {
    if (!cpfValid) {
      setCheckoutError('Informe um CPF válido para continuar.')
      return
    }
    setStatus('creating')
    setCheckoutError(null)
    try {
      const result = await window.api.createPixCheckout(sanitizeCpf(cpf))
      window.open(result.checkoutUrl, '_blank')
      startPolling()
    } catch (err) {
      setStatus('error')
      setCheckoutError(err instanceof Error ? err.message : 'Não foi possível gerar o Pix.')
    }
  }

  const busy = status === 'creating' || status === 'waiting'

  return (
    <ModalShell title="TTK Video Mixer Pro" onClose={closeModal}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-300">{billingErrorMessage(paywallReason)}</p>

        {entitlement && entitlement.trialTotal > 0 && (
          <p className="text-xs text-gray-500">
            Teste grátis: {entitlement.trialUsed} de {entitlement.trialTotal} vídeos utilizados.
          </p>
        )}

        {status === 'paid' && (
          <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            Pagamento confirmado! Liberando o TTK Video Mixer Pro...
          </div>
        )}

        {status === 'waiting' && (
          <div className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand-light">
            Aguardando confirmação do pagamento na aba do navegador. Isso é atualizado automaticamente assim que o
            pagamento for aprovado.
          </div>
        )}

        {checkoutError && <p className="text-xs text-error">{checkoutError}</p>}

        {status !== 'paid' && (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand/40 bg-bg-soft p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-400">CPF (obrigatório para pagamento)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={formatCpf(cpf)}
                onChange={(e) => setCpf(sanitizeCpf(e.target.value))}
                maxLength={14}
                disabled={busy}
                className="w-full rounded-lg border border-bg-border bg-bg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-brand focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <p className="text-lg font-extrabold text-white">{PRO_MONTHLY_PRICE_LABEL}/mês</p>
              <p className="text-xs text-gray-400">Vídeos ilimitados, sem marca d&apos;água. Cancele quando quiser.</p>
            </div>
            <button
              onClick={handleCardCheckout}
              disabled={busy || !cpfValid}
              className="rounded-lg bg-brand py-2.5 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-dark disabled:opacity-50"
            >
              {status === 'creating' ? 'Aguarde...' : 'Assinar com Cartão'}
            </button>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="h-px flex-1 bg-bg-border" />
              ou
              <div className="h-px flex-1 bg-bg-border" />
            </div>

            <div>
              <p className="text-sm font-bold text-white">{PIX_30_DAYS_PRICE_LABEL} via Pix</p>
              <p className="text-xs text-gray-400">Libera 30 dias de acesso Pro. Pagamento único, sem renovação automática.</p>
            </div>
            <button
              onClick={handlePixCheckout}
              disabled={busy || !cpfValid}
              className="rounded-lg border border-brand px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-brand-light hover:bg-brand/10 disabled:opacity-50"
            >
              {status === 'creating' ? 'Aguarde...' : 'Pagar 30 dias com Pix'}
            </button>
          </div>
        )}

        <button onClick={closeModal} className="self-center text-xs text-gray-500 hover:text-gray-300">
          Fechar
        </button>
      </div>
    </ModalShell>
  )
}

export default PaywallModal
