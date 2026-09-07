import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * Server Components / Route Handlers client. Returns null when Supabase
 * isn't configured yet (see .env.example) instead of throwing, so pages can
 * render an honest fallback rather than a 500.
 */
export function getServerSupabaseClient(): ReturnType<typeof createServerClient> | null {
  if (!isSupabaseConfigured()) return null
  const cookieStore = cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Called from a Server Component render — middleware refreshes the
          // session cookie instead, so this can be safely ignored.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Same as above.
        }
      }
    }
  })
}
