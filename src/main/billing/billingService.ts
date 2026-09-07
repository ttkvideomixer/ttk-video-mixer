import { randomUUID } from 'node:crypto'
import { getSupabaseClient } from '../auth/supabaseClient'
import { normalizeFunctionsError } from './httpFunctionError'

async function invoke<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { 'Idempotency-Key': randomUUID() }
  })
  if (error) throw await normalizeFunctionsError(error)
  return data as T
}

export async function createCardCheckout(): Promise<{ checkoutUrl?: string; alreadySubscribed?: boolean }> {
  return invoke('create-checkout')
}

export async function createPixCheckout(): Promise<{ checkoutUrl: string; reused?: boolean }> {
  return invoke('create-pix-payment')
}

export async function cancelSubscription(): Promise<{ ok: true; cancelAtPeriodEnd: boolean }> {
  return invoke('cancel-subscription')
}

export async function reactivateSubscription(): Promise<{ ok: true; note: string }> {
  return invoke('reactivate-subscription')
}

export async function reconcileSubscription(): Promise<{ ok: true; changed: boolean }> {
  return invoke('reconcile-subscription')
}

export async function deleteAccount(): Promise<{ ok: true }> {
  return invoke('delete-account')
}
