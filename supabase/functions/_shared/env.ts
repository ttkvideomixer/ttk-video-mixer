/**
 * Fails fast and loudly when a required secret is missing, instead of the
 * function silently misbehaving later (project rule: never invent
 * credentials, never fail silently).
 */
export function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}. Configure it as a Supabase Edge Function secret.`)
  }
  return value
}

export function optionalEnv(name: string, fallback: string): string {
  const value = Deno.env.get(name)
  return value && value.trim().length > 0 ? value : fallback
}

export function boolEnv(name: string, fallback: boolean): boolean {
  const value = Deno.env.get(name)
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Local/dev convenience only: lets `get-entitlement` and `authorize-generation`
 * return a synthetic unlimited entitlement without a fully configured Pagar.me
 * integration. Hard-blocked in production regardless of the BILLING_MOCK
 * value, so a stray "true" left in a deployed secret can never grant access.
 */
export function isBillingMockActive(): boolean {
  if (Deno.env.get('NODE_ENV') === 'production') return false
  return boolEnv('BILLING_MOCK', false)
}
