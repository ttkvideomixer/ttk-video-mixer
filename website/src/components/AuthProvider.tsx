'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'

interface AuthContextValue {
  user: User | null
  loading: boolean
  supabaseConfigured: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, supabaseConfigured: false })

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getBrowserSupabaseClient()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [supabase])

  return <AuthContext.Provider value={{ user, loading, supabaseConfigured: Boolean(supabase) }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
