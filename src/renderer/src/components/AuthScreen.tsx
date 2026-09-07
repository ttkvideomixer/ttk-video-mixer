import { useState } from 'react'
import { useAuthStore } from '../state/useAuthStore'

type Mode = 'signIn' | 'signUp' | 'forgotPassword'

function AuthScreen(): JSX.Element {
  const [mode, setMode] = useState<Mode>('signIn')
  const [name, setName] = useState('')
  const [tiktokUsername, setTiktokUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const authBusy = useAuthStore((s) => s.authBusy)
  const authError = useAuthStore((s) => s.authError)
  const needsEmailConfirmation = useAuthStore((s) => s.needsEmailConfirmation)
  const clearAuthError = useAuthStore((s) => s.clearAuthError)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset)

  const switchMode = (next: Mode): void => {
    clearAuthError()
    setResetSent(false)
    setMode(next)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (mode === 'signIn') {
      await signIn(email.trim(), password)
    } else if (mode === 'signUp') {
      await signUp(name.trim(), email.trim(), password, tiktokUsername.trim() || null)
    } else {
      await sendPasswordReset(email.trim())
      setResetSent(true)
    }
  }

  if (needsEmailConfirmation) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg px-6">
        <div className="w-full max-w-md rounded-2xl border border-bg-border bg-bg-card p-8 text-center shadow-card">
          <h1 className="text-xl font-bold text-white">Confirme seu e-mail</h1>
          <p className="mt-3 text-sm text-gray-400">
            Enviamos um link de confirmação para <span className="text-gray-200">{email}</span>. Abra seu e-mail e
            confirme sua conta para começar a usar o TTK Video Mixer.
          </p>
          <button
            onClick={() => switchMode('signIn')}
            className="mt-6 rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft"
          >
            Voltar para entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-md rounded-2xl border border-bg-border bg-bg-card p-8 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            TTK VIDEO <span className="text-brand-light">MIXER</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {mode === 'signIn' && 'Entre na sua conta para continuar.'}
            {mode === 'signUp' && 'Crie sua conta e ganhe 27 vídeos grátis.'}
            {mode === 'forgotPassword' && 'Recupere o acesso à sua conta.'}
          </p>
        </div>

        {mode !== 'forgotPassword' && (
          <>
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={authBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-bg-border bg-white py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
            >
              Continuar com Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
              <div className="h-px flex-1 bg-bg-border" />
              ou
              <div className="h-px flex-1 bg-bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signUp' && (
            <>
              <input
                type="text"
                required
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
              />
              <input
                type="text"
                placeholder="@usuário do TikTok (opcional)"
                value={tiktokUsername}
                onChange={(e) => setTiktokUsername(e.target.value)}
                className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
              />
            </>
          )}
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
          />
          {mode !== 'forgotPassword' && (
            <input
              type="password"
              required
              minLength={6}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
            />
          )}

          {authError && <p className="text-xs text-error">{authError}</p>}
          {resetSent && mode === 'forgotPassword' && !authError && (
            <p className="text-xs text-success">Se este e-mail existir, enviamos um link de recuperação.</p>
          )}

          <button
            type="submit"
            disabled={authBusy}
            className="mt-2 rounded-lg bg-brand py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {authBusy
              ? 'Aguarde...'
              : mode === 'signIn'
                ? 'Entrar'
                : mode === 'signUp'
                  ? 'Criar conta grátis'
                  : 'Enviar link de recuperação'}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-xs text-gray-400">
          {mode === 'signIn' && (
            <>
              <button onClick={() => switchMode('forgotPassword')} className="hover:text-gray-200">
                Esqueci minha senha
              </button>
              <button onClick={() => switchMode('signUp')} className="hover:text-gray-200">
                Não tem conta? <span className="text-brand-light">Criar conta grátis</span>
              </button>
            </>
          )}
          {mode === 'signUp' && (
            <button onClick={() => switchMode('signIn')} className="hover:text-gray-200">
              Já tem conta? <span className="text-brand-light">Entrar</span>
            </button>
          )}
          {mode === 'forgotPassword' && (
            <button onClick={() => switchMode('signIn')} className="hover:text-gray-200">
              Voltar para entrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthScreen
