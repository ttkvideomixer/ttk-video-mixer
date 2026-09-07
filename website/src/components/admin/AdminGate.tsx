'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import type { AdminMe } from '@/types/admin'

type GateState = 'loading' | 'signed_out' | 'forbidden' | 'needs_mfa' | 'ready'

const AdminMeContext = createContext<AdminMe | null>(null)

export function useAdminMe(): AdminMe {
  const value = useContext(AdminMeContext)
  if (!value) throw new Error('useAdminMe deve ser usado dentro de AdminGate')
  return value
}

const SECURITY_PATH = '/admin/security'

export default function AdminGate({ children }: { children: ReactNode }): JSX.Element {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<GateState>('loading')
  const [me, setMe] = useState<AdminMe | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setState('signed_out')
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    const supabase = getBrowserSupabaseClient()
    if (!supabase) {
      setState('forbidden')
      return
    }

    let cancelled = false

    async function run(): Promise<void> {
      // Role first — a non-staff user should never learn anything about the
      // MFA requirement past this point.
      const response = await fetch('/api/admin/me')
      if (!response.ok) {
        if (!cancelled) setState('forbidden')
        return
      }
      const meData = (await response.json()) as AdminMe

      const { data: aal } = await supabase!.auth.mfa.getAuthenticatorAssuranceLevel()
      const mfaSatisfied = !aal || aal.nextLevel !== 'aal2' || aal.currentLevel === 'aal2'

      if (!mfaSatisfied && pathname !== SECURITY_PATH) {
        if (!cancelled) {
          setState('needs_mfa')
          router.replace(SECURITY_PATH)
        }
        return
      }

      if (!cancelled) {
        setMe(meData)
        setState('ready')
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, pathname])

  if (state === 'loading' || state === 'signed_out' || state === 'needs_mfa') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Carregando...</div>
  }

  if (state === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-lg font-bold text-white">Acesso restrito</p>
        <p className="max-w-sm text-sm text-gray-400">
          Esta área é exclusiva para a equipe do TTK VIDEO MIXER. Se você acredita que deveria ter acesso, contate um
          administrador.
        </p>
      </div>
    )
  }

  if (!me) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Carregando...</div>

  return <AdminMeContext.Provider value={me}>{children}</AdminMeContext.Provider>
}
