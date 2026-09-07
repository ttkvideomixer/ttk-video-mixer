'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/AuthCard'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'
import { getUtmParams } from '@/lib/utm'

function normalizeTiktokUsername(input: string): string | undefined {
  const trimmed = input.trim().replace(/^@/, '')
  return trimmed.length > 0 ? trimmed : undefined
}

export default function SignupPage(): JSX.Element {
  const [name, setName] = useState('')
  const [tiktokUsername, setTiktokUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const router = useRouter()
  const supabase = getBrowserSupabaseClient()

  useEffect(() => {
    track('signup_started')
  }, [])

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (!supabase) {
      setError('O cadastro ainda não está configurado neste ambiente (Supabase não configurado).')
      return
    }

    setBusy(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            tiktok_username: normalizeTiktokUsername(tiktokUsername),
            signup_source: 'website',
            ...getUtmParams()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`
        }
      })
      if (signUpError) throw signUpError

      if (!data.session) {
        setNeedsEmailConfirmation(true)
        return
      }

      track('signup_completed', { method: 'password', ...getUtmParams() })
      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar sua conta.')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async (): Promise<void> => {
    if (!supabase) {
      setError('O cadastro com Google ainda não está configurado neste ambiente.')
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

  if (needsEmailConfirmation) {
    return (
      <AuthCard title="Confirme seu e-mail" subtitle="Falta pouco para começar a testar.">
        <p className="text-center text-sm text-gray-400">
          Enviamos um link de confirmação para <span className="text-gray-200">{email}</span>. Abra seu e-mail e
          confirme sua conta para começar o diagnóstico de perfil e liberar seus 27 vídeos grátis.
        </p>
        <Link href="/login" className="mt-6 block rounded-lg border border-bg-border px-4 py-2 text-center text-sm text-gray-300 hover:bg-bg-soft">
          Voltar para entrar
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Criar conta grátis" subtitle="Ganhe 27 vídeos grátis para testar o TTK VIDEO MIXER.">
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
          type="text"
          required
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
        />
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
          minLength={6}
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Confirmar senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
        />
        <input
          type="text"
          placeholder="@ do TikTok (opcional)"
          value={tiktokUsername}
          onChange={(e) => setTiktokUsername(e.target.value)}
          className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
        />

        {error && <p className="text-xs text-error">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-lg bg-brand-gradient py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Aguarde...' : 'Criar Minha Conta'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-gray-400">
        Já tem conta?{' '}
        <Link href="/login" className="text-brand-light">
          Entrar
        </Link>
      </p>
    </AuthCard>
  )
}
