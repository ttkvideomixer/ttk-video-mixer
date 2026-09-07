import { requireEnv } from './env.ts'

/**
 * Pagar.me V5's documented webhook object (docs.pagar.me/reference/
 * listar-webhooks) does not expose an HMAC signature field — unlike e.g.
 * Stripe. The commonly used and dashboard-supported approach for this
 * gateway is embedding HTTP Basic Auth credentials directly in the webhook
 * URL when you register it (https://<user>:<PAGARME_WEBHOOK_SECRET>@your-
 * project.functions.supabase.co/billing-webhook), which Pagar.me then sends
 * back as a standard `Authorization: Basic ...` header on every POST.
 *
 * VERIFY BEFORE GOING LIVE: confirm this is still how your Pagar.me
 * dashboard lets you configure webhook auth (Configurações > Webhooks), and
 * adjust this check if a different mechanism (e.g. a signature header) is
 * offered for your account. Never accept an unauthenticated POST as payment
 * confirmation — that's the one hard rule here regardless of mechanism.
 */
export function isAuthorizedWebhookRequest(req: Request): boolean {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Basic ')) return false

  let decoded: string
  try {
    decoded = atob(header.slice('Basic '.length))
  } catch {
    return false
  }

  const [, password] = decoded.split(':')
  const expected = requireEnv('PAGARME_WEBHOOK_SECRET')
  return password === expected
}
