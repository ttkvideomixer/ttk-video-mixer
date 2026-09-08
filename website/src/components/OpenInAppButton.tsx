'use client'

import { useState } from 'react'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'

/**
 * "Already installed the app? Sign in automatically" — mints a one-time
 * token via create-desktop-handoff and hands it to the installed app
 * through the `videomixer://auth/handoff` deep link, so someone who already
 * logged in here doesn't have to type a password again inside the app. Only
 * works if the app is already installed (the OS silently ignores the
 * protocol otherwise) — first-time installers still log in once in the app.
 */
export default function OpenInAppButton(): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const supabase = getBrowserSupabaseClient()
      const session = supabase ? (await supabase.auth.getSession()).data.session : null
      if (!session) {
        setError('Sua sessão expirou. Atualize a página e faça login de novo.')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-desktop-handoff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.token) {
        setError(json?.error?.message ?? 'Não foi possível gerar o login automático agora.')
        return
      }

      window.location.href = `videomixer://auth/handoff?token=${encodeURIComponent(json.token)}`
    } catch {
      setError('Não foi possível gerar o login automático agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-xs font-semibold text-brand-light hover:underline disabled:opacity-50"
      >
        {busy ? 'Gerando link...' : 'Já instalou o app? Entrar automaticamente →'}
      </button>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      <p className="mt-1 text-[11px] text-gray-500">Só funciona se o TTK VIDEO MIXER já estiver instalado neste computador.</p>
    </div>
  )
}
