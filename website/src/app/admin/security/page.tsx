'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'

type Phase = 'loading' | 'satisfied' | 'enroll' | 'challenge'

export default function AdminSecurityPage(): JSX.Element {
  const router = useRouter()
  const { push } = useToast()
  const supabase = getBrowserSupabaseClient()

  const [phase, setPhase] = useState<Phase>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    async function bootstrap(): Promise<void> {
      const { data: aal } = await supabase!.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal && aal.currentLevel === 'aal2') {
        setPhase('satisfied')
        router.replace('/admin')
        return
      }

      const { data: factors } = await supabase!.auth.mfa.listFactors()
      const existingTotp = factors?.totp?.find((f) => f.status === 'verified')

      if (existingTotp) {
        const { data: challenge, error: challengeError } = await supabase!.auth.mfa.challenge({ factorId: existingTotp.id })
        if (challengeError) {
          setError(challengeError.message)
          return
        }
        setFactorId(existingTotp.id)
        setChallengeId(challenge.id)
        setPhase('challenge')
      } else {
        const { data: enrolled, error: enrollError } = await supabase!.auth.mfa.enroll({ factorType: 'totp' })
        if (enrollError) {
          setError(enrollError.message)
          return
        }
        setFactorId(enrolled.id)
        setQrCode(enrolled.totp.qr_code)
        setSecret(enrolled.totp.secret)
        setPhase('enroll')
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEnrollVerify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!supabase || !factorId) return
    setBusy(true)
    setError(null)
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
      if (verifyError) throw verifyError
      push('success', 'Verificação em duas etapas ativada.')
      router.replace('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.')
    } finally {
      setBusy(false)
    }
  }

  const handleChallengeVerify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!supabase || !factorId || !challengeId) return
    setBusy(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
      if (verifyError) throw verifyError
      router.replace('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-xl font-extrabold text-white">Verificação em duas etapas</h1>
      <p className="text-sm text-gray-400">
        Contas administrativas exigem um segundo fator (TOTP) para acessar o painel — use um app como Google
        Authenticator ou 1Password.
      </p>

      {phase === 'loading' && <p className="text-sm text-gray-500">Carregando...</p>}

      {phase === 'enroll' && (
        <form onSubmit={handleEnrollVerify} className="flex w-full flex-col items-center gap-4 rounded-2xl border border-bg-border bg-bg-card p-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI QR code, not a static asset */}
          {qrCode && <img src={qrCode} alt="QR code para configurar autenticação em duas etapas" className="h-40 w-40 rounded-lg bg-white p-2" />}
          {secret && <p className="break-all text-xs text-gray-500">Ou digite manualmente: {secret}</p>}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            maxLength={6}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-center text-lg tracking-widest text-white focus:border-brand focus:outline-none"
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <button type="submit" disabled={busy || code.length < 6} className="w-full rounded-lg bg-brand-gradient py-2.5 text-sm font-bold uppercase text-white disabled:opacity-50">
            {busy ? 'Verificando...' : 'Ativar'}
          </button>
        </form>
      )}

      {phase === 'challenge' && (
        <form onSubmit={handleChallengeVerify} className="flex w-full flex-col items-center gap-4 rounded-2xl border border-bg-border bg-bg-card p-6">
          <p className="text-sm text-gray-300">Digite o código do seu aplicativo autenticador.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            maxLength={6}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-center text-lg tracking-widest text-white focus:border-brand focus:outline-none"
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <button type="submit" disabled={busy || code.length < 6} className="w-full rounded-lg bg-brand-gradient py-2.5 text-sm font-bold uppercase text-white disabled:opacity-50">
            {busy ? 'Verificando...' : 'Confirmar'}
          </button>
        </form>
      )}
    </div>
  )
}
