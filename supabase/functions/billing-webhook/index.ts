import { corsHeaders } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseClients.ts'
import { isAuthorizedWebhookRequest } from '../_shared/webhookAuth.ts'
import { runWebhookEvent, type PagarmeWebhookPayload } from '../_shared/processPagarmeWebhookEvent.ts'

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * POST /webhooks/pagarme — the ONLY thing that ever flips an entitlement
 * from free to pro or back. Checkout redirects (see create-checkout /
 * create-pix-payment) never grant access on their own — see project rule
 * "não confiar no redirect do checkout". Event handling itself lives in
 * _shared/processPagarmeWebhookEvent.ts, shared with admin-reprocess-webhook.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!isAuthorizedWebhookRequest(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const rawBody = await req.text()
  let payload: PagarmeWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const admin = getAdminClient()
  const payloadHash = await sha256Hex(rawBody)

  // Idempotency: the same event id is only ever processed once. A second
  // delivery of the same event (Pagar.me retries on non-2xx, or infra
  // duplicates) is acknowledged but not reapplied.
  const { error: insertError } = await admin
    .from('payment_webhook_events')
    .insert({ provider_event_id: payload.id, event_type: payload.type, payload_hash: payloadHash, payload })

  if (insertError) {
    // Unique violation on provider_event_id == already processed.
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Never returns an error status here: the event is already durably
  // stored, and a processing failure is recorded on the row itself
  // (last_error) for /admin/system/webhooks to surface and retry.
  await runWebhookEvent(admin, payload)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
