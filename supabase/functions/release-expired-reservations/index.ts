import { getAdminClient } from '../_shared/supabaseClients.ts'

/**
 * Scheduled function (wire up via Supabase's Cron/pg_cron — e.g. every 5
 * minutes — see README "Configuração comercial"). Refunds trial credits
 * for reservations that were authorized but never completed (crashed
 * client, killed process) after a conservative grace period. Not exposed
 * to the desktop app; only ever invoked by the scheduler using the
 * service role.
 */
Deno.serve(async (_req) => {
  const admin = getAdminClient()
  const { data, error } = await admin.rpc('release_expired_reservations')

  if (error) {
    console.error('release-expired-reservations failed', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, released: data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
