'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/AuthCard'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'
import { useToast } from '@/components/ui/Toast'

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'password' | 'forgot'>('password')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const { push } = useToast()
  const supabase = getBrowserSupabaseClient()

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!supabase) {
      setError('O login ainda não está configurado neste ambiente (Supabase não configurado).')
      return
    }

    setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`
        })
        if (resetError) throw resetError
        setResetSent(true)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      track('login', { method: 'password' })
      push('success', 'Login realizado com sucesso.')
      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar. Verifique seus dados.')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async (): Promise<void> => {
    if (!supabase) {
      setError('O login com Google ainda não está configurado neste ambiente.')
      return
    }
    setBusy(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` }
    })
    if (oauthError) {
      setError(oauthError.message)
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Entrar" subtitle="Acesse sua conta do TTK VIDEO MIXER.">
      {mode === 'password' ? (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-bg-border bg-white py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          >
            Continuar com Google
          </button>
          <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
            <div className="h-px flex-1 bg-bg-border" />
            ou
            <div className="h-px flex-1 bg-bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
            />
            <input
              type="password"
              required
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
            />

            {error && <p className="text-xs text-error">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-lg bg-brand-gradient py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Aguarde...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-xs text-gray-400">
            <button onClick={() => setMode('forgot')} className="hover:text-gray-200">
              Esqueci minha senha
            </button>
            <Link href="/criar-conta" className="hover:text-gray-200">
              Não tem conta? <span className="text-brand-light">Criar conta grátis</span>
            </Link>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
          />
          {error && <p className="text-xs text-error">{error}</p>}
          {resetSent && !error && <p className="text-xs text-success">Se este e-mail existir, enviamos um link de recuperação.</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-gradient py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Aguarde...' : 'Enviar link de recuperação'}
          </button>
          <button type="button" onClick={() => setMode('password')} className="text-xs text-gray-400 hover:text-gray-200">
            Voltar para entrar
          </button>
        </form>
      )}
    </AuthCard>
  )
}
