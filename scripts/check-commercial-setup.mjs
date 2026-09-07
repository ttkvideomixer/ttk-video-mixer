#!/usr/bin/env node
// Verifies that every environment variable the commercial layer needs is
// present, without ever printing a secret value. Run this after filling in
// .env (desktop) and the Supabase Edge Function secrets (backend) — see
// README "Configuração comercial".
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

function loadDotEnv(path) {
  if (!existsSync(path)) return {}
  const content = readFileSync(path, 'utf-8')
  const values = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return values
}

const dotEnv = loadDotEnv(join(rootDir, '.env'))
const env = { ...dotEnv, ...process.env }

const DESKTOP_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

const BACKEND_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAGARME_SECRET_KEY',
  'PAGARME_PLAN_ID',
  'PAGARME_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'APP_PUBLIC_URL',
  'APP_DEEP_LINK_SCHEME'
]

const OPTIONAL_VARS = ['PAYMENT_ENV', 'APPLE_PAY_ENABLED', 'BILLING_MOCK']

let missing = 0

function check(name, required) {
  const present = !!env[name] && env[name].trim().length > 0
  console.log(`${present ? '✓' : required ? '✗' : '·'} ${name}`)
  if (required && !present) missing++
}

console.log('\n== Desktop (Electron, valores públicos) ==')
DESKTOP_VARS.forEach((v) => check(v, true))

console.log('\n== Backend (Supabase Edge Functions, secrets) ==')
BACKEND_VARS.forEach((v) => check(v, true))

console.log('\n== Opcional ==')
OPTIONAL_VARS.forEach((v) => check(v, false))

console.log('')
if (missing > 0) {
  console.error(`${missing} variável(is) obrigatória(s) ausente(s). Configure-as antes de rodar em produção.`)
  process.exit(1)
} else {
  console.log('Tudo configurado.')
}
