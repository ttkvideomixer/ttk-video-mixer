import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { electronAuthStorage } from './supabaseAuthStorage'

let client: SupabaseClient | null = null

/**
 * SUPABASE_URL / SUPABASE_ANON_KEY are the only two commercial-layer values
 * that may ever live inside the Electron app — both are public by design
 * (see project rule). They're baked in at build time via Vite's env
 * handling (VITE_-prefixed vars from .env), same mechanism any public web
 * client uses for a Supabase anon key.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. Copie .env.example para .env e preencha os valores do seu projeto Supabase.'
    )
  }

  client = createClient(url, anonKey, {
    auth: {
      storage: electronAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    // The main process is plain Node, which has no global `WebSocket` (that
    // only exists in Chromium/renderer contexts) — Realtime needs one
    // explicitly passed in to receive entitlement_changed updates instantly
    // instead of waiting for the next heartbeat (see useAuthStore.ts). The
    // `ws` package's type shape doesn't structurally match realtime-js's
    // `WebSocketLikeConstructor` (event-argument types differ), even though
    // it's runtime-compatible — this is the standard, documented way to wire
    // `ws` in for Supabase Realtime outside a browser.
    realtime: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport: WebSocket as any
    }
  })

  return client
}
