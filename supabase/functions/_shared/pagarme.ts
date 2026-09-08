import { requireEnv } from './env.ts'

const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

/** Monthly price for Video Mixer Pro, in cents. Never trust a client-sent amount. */
export const PRO_MONTHLY_PRICE_CENTS = 1499
export const PRO_MONTHLY_CURRENCY = 'BRL'
export const PIX_30_DAYS_PRICE_CENTS = 1499

interface PagarmeCustomerRef {
  customer_id?: string
  customer?: { name: string; email: string; code?: string }
}

export interface CreateCardCheckoutLinkParams extends PagarmeCustomerRef {
  planId: string
  userId: string
}

export interface CreateOrderCheckoutLinkParams extends PagarmeCustomerRef {
  userId: string
  amountCents: number
  itemName: string
}

/**
 * Thin wrapper around Pagar.me API V5 (https://api.pagar.me/core/v5). Auth
 * is HTTP Basic with the secret key as username and an empty password —
 * this is the officially documented scheme, not something invented here.
 *
 * VERIFY BEFORE GOING LIVE: the `/paymentlinks` path below is based on the
 * "Link de Pagamento" hosted-checkout product (docs.pagar.me/reference/
 * checkout-link and .../create-link) — the reference page confirms the
 * request/response body shape (type, payment_settings, cart_settings,
 * customer_settings, and a returned `url`) but did not expose the literal
 * REST path in the fetched content. Confirm the exact path in the API
 * Reference (or Pagar.me's Postman/OpenAPI collection) against your account
 * before the first real checkout — do not assume this is correct in
 * production without that check.
 */
async function pagarmeRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const secretKey = requireEnv('PAGARME_SECRET_KEY')
  const basicAuth = btoa(`${secretKey}:`)

  const response = await fetch(`${PAGARME_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await response.text()
  const json = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`Pagar.me ${method} ${path} failed (${response.status}): ${text.slice(0, 500)}`)
  }

  return json as T
}

interface PaymentLinkResponse {
  id: string
  url: string
  status: string
}

/**
 * Creates a Pagar.me hosted "Link de Pagamento" for a recurring card
 * subscription. The buyer enters their card on Pagar.me's own domain — this
 * backend (and the Electron app) never sees the PAN/CVV, by design.
 */
export async function createCardSubscriptionCheckoutLink(params: CreateCardCheckoutLinkParams): Promise<{ id: string; url: string }> {
  const payload = {
    type: 'subscription',
    name: 'Video Mixer Pro — assinatura mensal',
    is_building: false,
    payment_settings: {
      accepted_payment_methods: ['credit_card']
    },
    cart_settings: {
      recurrences: [{ start_in: 1, plan_id: params.planId }]
    },
    ...(params.customer_id ? { customer_settings: { customer_id: params.customer_id } } : { customer_settings: { customer: params.customer } }),
    metadata: { user_id: params.userId }
  }

  const result = await pagarmeRequest<PaymentLinkResponse>('/paymentlinks', 'POST', payload)
  return { id: result.id, url: result.url }
}

/**
 * Creates a one-time Pagar.me hosted checkout for "30 dias de Pro via Pix".
 * Deliberately NOT a subscription — Pix has no confirmed recurring product
 * on this integration, so it's sold and tracked as a single 30-day pass
 * (see project rule: never call this "assinatura automática via Pix").
 */
export async function createPixOrderCheckoutLink(params: CreateOrderCheckoutLinkParams): Promise<{ id: string; url: string }> {
  const payload = {
    type: 'order',
    name: params.itemName,
    is_building: false,
    payment_settings: {
      accepted_payment_methods: ['pix']
    },
    cart_settings: {
      items: [{ amount: params.amountCents, name: params.itemName, default_quantity: 1 }]
    },
    ...(params.customer_id ? { customer_settings: { customer_id: params.customer_id } } : { customer_settings: { customer: params.customer } }),
    metadata: { user_id: params.userId, purchase_type: 'pix_30_days' }
  }

  const result = await pagarmeRequest<PaymentLinkResponse>('/paymentlinks', 'POST', payload)
  return { id: result.id, url: result.url }
}

export interface PagarmeCustomer {
  id: string
  name: string
  email: string
}

/**
 * Pagar.me requires a real CPF (document + document_type + type) to create
 * a customer — name/email alone gets rejected. `document` must already be a
 * validated, digits-only CPF (see _shared/cpf.ts / callers).
 */
export async function findOrCreatePagarmeCustomer(name: string, email: string, document: string): Promise<PagarmeCustomer> {
  // Pagar.me V5 doesn't offer a documented "find by email" filter that is
  // safe to rely on across accounts, so the caller is responsible for
  // persisting and reusing `provider_customer_id` once created (see
  // billing/subscriptions.provider_customer_id) rather than searching here.
  const created = await pagarmeRequest<PagarmeCustomer>('/customers', 'POST', {
    name,
    email,
    type: 'individual',
    document,
    document_type: 'CPF'
  })
  return created
}

export async function getPagarmeSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
  return pagarmeRequest(`/subscriptions/${subscriptionId}`, 'GET')
}

export async function cancelPagarmeSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
  return pagarmeRequest(`/subscriptions/${subscriptionId}`, 'DELETE')
}

/**
 * VERIFY BEFORE GOING LIVE: Pagar.me V5's Charges resource documents
 * create/get/list/capture actions; a refund is expected at
 * POST /charges/{charge_id}/refund per the standard V5 Charges reference,
 * but (same caveat as /paymentlinks above) this was not independently
 * re-confirmed against the literal path in this session. Confirm against
 * the API Reference for your account before the first real refund — the
 * admin panel's refund action calls this and nothing else; it never marks a
 * payment refunded in the database without this call succeeding first.
 */
export async function refundPagarmeCharge(chargeId: string, amountCents?: number): Promise<Record<string, unknown>> {
  return pagarmeRequest(`/charges/${chargeId}/refund`, 'POST', amountCents ? { amount: amountCents } : undefined)
}
