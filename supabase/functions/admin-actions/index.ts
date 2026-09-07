import { handleCorsPreflight } from '../_shared/cors.ts'
import { errorResponse, jsonResponse, ErrorCodes } from '../_shared/errors.ts'
import { requireAuthedUser, getAdminClient, HttpError } from '../_shared/supabaseClients.ts'
import { cancelPagarmeSubscription, getPagarmeSubscription, refundPagarmeCharge } from '../_shared/pagarme.ts'
import { runWebhookEvent, type PagarmeWebhookPayload } from '../_shared/processPagarmeWebhookEvent.ts'
import { requireEnv } from '../_shared/env.ts'

/**
 * Every admin operation that needs the Pagar.me secret key or the Supabase
 * service role — the only things an admin's own browser session/anon key
 * can never do — is concentrated in this ONE Edge Function, dispatched by
 * `action`. Everything else in the admin panel (block/unblock/grants/notes/
 * dashboard/lists) goes through RLS + SECURITY DEFINER RPCs directly from
 * the Next.js server using the admin's own session — see
 * supabase/migrations/20260910000000_admin_panel.sql.
 */
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { user } = await requireAuthedUser(req)
    const admin = getAdminClient()

    const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profileError || !profile) throw new HttpError(403, ErrorCodes.AUTH_REQUIRED, 'Perfil não encontrado.')
    const role = profile.role as string
    if (!['admin', 'super_admin'].includes(role)) {
      throw new HttpError(403, ErrorCodes.AUTH_REQUIRED, 'Apenas administradores podem executar esta ação.')
    }

    const body = await req.json()
    const action = body.action as string

    switch (action) {
      case 'cancel_subscription':
        return jsonResponse(await cancelSubscription(admin, user.id, body))
      case 'reactivate_subscription':
        return jsonResponse(await reactivateSubscription(admin, user.id, body))
      case 'reconcile_subscription':
        return jsonResponse(await reconcileSubscription(admin, body))
      case 'refund_payment':
        return jsonResponse(await refundPayment(admin, user.id, body))
      case 'revoke_sessions':
        return jsonResponse(await revokeSessions(admin, body))
      case 'reprocess_webhook':
        return jsonResponse(await reprocessWebhook(admin, body))
      case 'system_health':
        return jsonResponse(await systemHealth(admin))
      default:
        throw new HttpError(400, ErrorCodes.INVALID_REQUEST, `Ação desconhecida: ${action}`)
    }
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.code as never, err.message)
    console.error('admin-actions error', err)
    return errorResponse(500, ErrorCodes.SERVER_ERROR, 'Não foi possível concluir a ação administrativa.')
  }
})

// deno-lint-ignore no-explicit-any
async function auditLog(admin: any, adminUserId: string, actionType: string, targetUserId: string | null, payload: Record<string, unknown>): Promise<void> {
  await admin.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action_type: actionType,
    target_user_id: targetUserId,
    target_object_type: 'subscription',
    reason: (payload.reason as string) ?? null,
    new_value: payload
  })
}

// deno-lint-ignore no-explicit-any
async function cancelSubscription(admin: any, adminUserId: string, body: { subscriptionId: string; immediately?: boolean; reason: string }): Promise<Record<string, unknown>> {
  const { data: sub, error } = await admin.from('subscriptions').select('*').eq('id', body.subscriptionId).single()
  if (error || !sub) throw new HttpError(404, ErrorCodes.INVALID_REQUEST, 'Assinatura não encontrada.')

  if (sub.payment_type === 'credit_card_subscription' && sub.provider_subscription_id) {
    await cancelPagarmeSubscription(sub.provider_subscription_id)
  }

  const now = new Date().toISOString()
  if (body.immediately) {
    await admin.from('subscriptions').update({ status: 'canceled', period_end: now, updated_at: now }).eq('id', sub.id)
    await admin.from('entitlements').update({ status: 'canceled', current_period_end: now, updated_at: now }).eq('user_id', sub.user_id)
  } else {
    await admin.from('subscriptions').update({ status: 'canceled', cancel_at_period_end: true, updated_at: now }).eq('id', sub.id)
    await admin.from('entitlements').update({ cancel_at_period_end: true, updated_at: now }).eq('user_id', sub.user_id)
  }

  await auditLog(admin, adminUserId, 'SUBSCRIPTION_OVERRIDE', sub.user_id, { reason: body.reason, action: 'cancel', immediately: Boolean(body.immediately) })

  return { ok: true }
}

// deno-lint-ignore no-explicit-any
async function reactivateSubscription(admin: any, adminUserId: string, body: { subscriptionId: string; reason: string }): Promise<Record<string, unknown>> {
  const { data: sub, error } = await admin.from('subscriptions').select('*').eq('id', body.subscriptionId).single()
  if (error || !sub) throw new HttpError(404, ErrorCodes.INVALID_REQUEST, 'Assinatura não encontrada.')

  // Pagar.me's subscription DELETE is a hard cancel with no confirmed
  // un-cancel endpoint (same gap documented in reactivate-subscription/
  // index.ts) — this only flips the local flag, which is sufficient for
  // continued access up to the existing period_end, but does not resume
  // automatic billing next period without a fresh checkout.
  const now = new Date().toISOString()
  await admin.from('subscriptions').update({ cancel_at_period_end: false, updated_at: now }).eq('id', sub.id)
  await admin.from('entitlements').update({ cancel_at_period_end: false, updated_at: now }).eq('user_id', sub.user_id)

  await auditLog(admin, adminUserId, 'SUBSCRIPTION_OVERRIDE', sub.user_id, { reason: body.reason, action: 'reactivate' })

  return { ok: true, note: 'cancel_at_period_end removido localmente; não reinicia cobrança automática sem novo checkout.' }
}

// deno-lint-ignore no-explicit-any
async function reconcileSubscription(admin: any, body: { subscriptionId: string }): Promise<Record<string, unknown>> {
  const { data: sub, error } = await admin.from('subscriptions').select('*').eq('id', body.subscriptionId).single()
  if (error || !sub) throw new HttpError(404, ErrorCodes.INVALID_REQUEST, 'Assinatura não encontrada.')

  if (!sub.provider_subscription_id) {
    return { ok: true, changed: false, note: 'Sem provider_subscription_id ainda (Pix ou assinatura pendente).' }
  }

  const remote = await getPagarmeSubscription(sub.provider_subscription_id)
  const remoteStatus = String((remote as { status?: string }).status ?? '')

  const statusMap: Record<string, string> = { active: 'active', canceled: 'canceled', past_due: 'past_due', pending: 'pending' }
  const mapped = statusMap[remoteStatus]
  const changed = Boolean(mapped) && mapped !== sub.status

  if (changed) {
    await admin.from('subscriptions').update({ status: mapped, updated_at: new Date().toISOString() }).eq('id', sub.id)
    if (mapped === 'past_due') {
      await admin.from('entitlements').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('user_id', sub.user_id)
    }
  }

  return { ok: true, changed, remoteStatus }
}

// deno-lint-ignore no-explicit-any
async function refundPayment(admin: any, adminUserId: string, body: { billingEventId: string; amountCents?: number; reason: string }): Promise<Record<string, unknown>> {
  const { data: event, error } = await admin.from('billing_events').select('*').eq('id', body.billingEventId).single()
  if (error || !event) throw new HttpError(404, ErrorCodes.INVALID_REQUEST, 'Pagamento não encontrado.')
  if (!event.provider_object_id) throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'Pagamento sem identificador do provedor.')

  await refundPagarmeCharge(event.provider_object_id, body.amountCents)

  await admin.from('billing_events').insert({
    user_id: event.user_id,
    provider: 'pagarme',
    provider_event: 'admin.refund',
    provider_object_id: event.provider_object_id,
    status: 'refunded',
    amount_cents: body.amountCents ?? event.amount_cents,
    metadata: { requested_by: adminUserId, reason: body.reason }
  })

  await auditLog(admin, adminUserId, 'REFUND_REQUESTED', event.user_id, { reason: body.reason, billingEventId: event.id, amountCents: body.amountCents ?? event.amount_cents })

  return { ok: true }
}

// deno-lint-ignore no-explicit-any
async function revokeSessions(admin: any, body: { userId: string }): Promise<Record<string, unknown>> {
  await admin.from('devices').update({ revoked_at: new Date().toISOString() }).eq('user_id', body.userId).is('revoked_at', null)

  // Best-effort: invalidate the user's live Supabase sessions too. This is
  // NOT the product's real security boundary (that's account-blocked +
  // authorize-generation, checked fresh on every "Gerar Vídeos" click) — if
  // the installed supabase-js admin API here doesn't support this call, the
  // device revocation above still stands on its own.
  let sessionsRevoked = false
  try {
    // deno-lint-ignore no-explicit-any
    const adminAuth = (admin.auth as any).admin
    if (typeof adminAuth?.signOut === 'function') {
      await adminAuth.signOut(body.userId, 'global')
      sessionsRevoked = true
    }
  } catch (err) {
    console.warn('admin-actions: best-effort session revocation failed', err)
  }

  return { ok: true, sessionsRevoked }
}

// deno-lint-ignore no-explicit-any
async function reprocessWebhook(admin: any, body: { webhookEventId: string }): Promise<Record<string, unknown>> {
  const { data: row, error } = await admin
    .from('payment_webhook_events')
    .select('*')
    .eq('provider_event_id', body.webhookEventId)
    .single()
  if (error || !row) throw new HttpError(404, ErrorCodes.INVALID_REQUEST, 'Evento de webhook não encontrado.')
  if (!row.payload) {
    throw new HttpError(400, ErrorCodes.INVALID_REQUEST, 'Este evento foi recebido antes do payload bruto passar a ser armazenado — não pode ser reprocessado.')
  }

  await runWebhookEvent(admin, row.payload as PagarmeWebhookPayload)
  return { ok: true }
}

// deno-lint-ignore no-explicit-any
async function systemHealth(admin: any): Promise<Record<string, unknown>> {
  const results: Record<string, { ok: boolean; detail?: string }> = {}

  try {
    const { error } = await admin.from('profiles').select('id').limit(1)
    results.database = { ok: !error, detail: error?.message }
  } catch (err) {
    results.database = { ok: false, detail: String(err) }
  }

  try {
    requireEnv('PAGARME_SECRET_KEY')
    results.pagarmeConfigured = { ok: true }
  } catch {
    results.pagarmeConfigured = { ok: false, detail: 'PAGARME_SECRET_KEY não configurada' }
  }

  try {
    const { count, error } = await admin
      .from('payment_webhook_events')
      .select('*', { count: 'exact', head: true })
      .not('last_error', 'is', null)
    results.webhooksWithErrors = { ok: !error && (count ?? 0) === 0, detail: `${count ?? 0} evento(s) com erro` }
  } catch (err) {
    results.webhooksWithErrors = { ok: false, detail: String(err) }
  }

  return results
}
