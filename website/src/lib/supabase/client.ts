'use client'

import { createBrowserClient } from '@supabase/ssr'
import { isSupabaseConfigured } from '@/lib/env'

let cached: ReturnType<typeof createBrowserClient> | null = null

/**
 * Returns null instead of throwing when Supabase isn't configured yet, so the
 * marketing pages still render (with an honest "not configured" state) in an
 * environment that hasn't received real credentials — see .env.example.
 */
export function getBrowserSupabaseClient(): ReturnType<typeof createBrowserClient> | null {
  if (!isSupabaseConfigured()) return null
  if (cached) return cached
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  )
  return cached
}
