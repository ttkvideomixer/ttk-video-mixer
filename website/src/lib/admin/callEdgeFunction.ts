import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Calls the `admin-actions` Edge Function using the ADMIN'S OWN session
 * token (never a service-role key from this app) — the function itself
 * re-verifies the caller's role from `profiles.role` before doing anything
 * that needs the Pagar.me secret key or the Supabase service role (cancel/
 * reactivate/reconcile a subscription, refund a payment, reprocess a
 * webhook, best-effort session revocation, system health).
 */
export async function callAdminAction<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    return { ok: false, status: 401, message: 'Sessão administrativa expirada.' }
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-actions`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...payload })
  })

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    return { ok: false, status: response.status, message: json?.error?.message ?? 'Falha ao executar ação administrativa.' }
  }

  return { ok: true, data: json as T }
}
