#!/usr/bin/env node
// Idempotent bootstrap for the "Video Mixer Pro" monthly plan on Pagar.me.
// Checks for an existing plan by name before creating a new one, so running
// this twice never duplicates the plan. Prints PAGARME_PLAN_ID to set in
// your Supabase Edge Function secrets.
//
// Keep PRICE_CENTS in sync with supabase/functions/_shared/pagarme.ts
// (PRO_MONTHLY_PRICE_CENTS) — both must agree with what R$14,99/mês means.
//
// VERIFY BEFORE RUNNING: the /plans list/create request and response shapes
// below were not individually re-confirmed against a live fetch of the
// current API Reference (only /subscriptions and /paymentlinks were). Pagar.me
// also explicitly documents creating a plan by hand in the Dashboard as a
// normal path (section 159 already allows for this) — if this script's
// request shape doesn't match your account's current API, create the plan
// in the Dashboard instead and just set PAGARME_PLAN_ID from there.
const PRICE_CENTS = 1499
const PLAN_NAME = 'Video Mixer Pro'
const BASE_URL = 'https://api.pagar.me/core/v5'

const secretKey = process.env.PAGARME_SECRET_KEY
if (!secretKey) {
  console.error('PAGARME_SECRET_KEY não definido no ambiente. Exporte-o antes de rodar este script.')
  process.exit(1)
}

const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`

async function pagarme(path, method, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await response.text()
  const json = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(`Pagar.me ${method} ${path} falhou (${response.status}): ${text.slice(0, 500)}`)
  }
  return json
}

async function main() {
  console.log(`Procurando plano existente chamado "${PLAN_NAME}"...`)
  const list = await pagarme('/plans?size=100', 'GET')
  const existing = (list.data ?? []).find((plan) => plan.name === PLAN_NAME && plan.status !== 'deleted')

  if (existing) {
    console.log(`Plano já existe: ${existing.id}`)
    console.log(`\nDefina em seus secrets: PAGARME_PLAN_ID=${existing.id}`)
    return
  }

  console.log('Nenhum plano existente encontrado. Criando...')
  const created = await pagarme('/plans', 'POST', {
    name: PLAN_NAME,
    interval: 'month',
    interval_count: 1,
    billing_type: 'prepaid',
    items: [
      {
        name: PLAN_NAME,
        quantity: 1,
        pricing_scheme: { scheme_type: 'unit', price: PRICE_CENTS }
      }
    ],
    payment_methods: ['credit_card'],
    currency: 'BRL'
  })

  console.log(`Plano criado: ${created.id}`)
  console.log(`\nDefina em seus secrets: PAGARME_PLAN_ID=${created.id}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
