import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'

let channel: RealtimeChannel | null = null

/**
 * Lets an admin action (block, unblock, bonus grant) reach an already-open
 * desktop app within seconds instead of waiting for the ~12-minute
 * entitlement heartbeat (see useAuthStore.ts). This is a UX improvement, not
 * the security boundary: the real guarantee is that authorize-generation is
 * called fresh from the server on every "Gerar Vídeos" click regardless of
 * whether Realtime is connected.
 */
export function subscribeToEntitlementChanges(userId: string, onChange: () => void): void {
  unsubscribeFromEntitlementChanges()

  const supabase = getSupabaseClient()
  channel = supabase
    .channel(`entitlement-changes-${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'entitlements', filter: `user_id=eq.${userId}` },
      () => onChange()
    )
    .subscribe()
}

export function unsubscribeFromEntitlementChanges(): void {
  if (channel) {
    channel.unsubscribe()
    channel = null
  }
}
