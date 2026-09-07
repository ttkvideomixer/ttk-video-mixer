import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminContext, requireStaff, requestMeta } from '@/lib/admin/requireAdmin'
import { callAdminAction } from '@/lib/admin/callEdgeFunction'

const GRANT_TYPES = ['promo', 'support', 'influencer', 'partner', 'compensation', 'manual'] as const
const FRAUD_FLAG_TYPES = ['multiple_trial_accounts', 'chargeback', 'many_devices', 'abusive_requests'] as const
const ROLES = ['user', 'support', 'admin', 'super_admin'] as const

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('block'), reason: z.string().min(3) }),
  z.object({ type: z.literal('unblock'), reason: z.string().min(3) }),
  z.object({
    type: z.literal('grant_access'),
    grantType: z.enum(GRANT_TYPES),
    startAt: z.string(),
    endAt: z.string(),
    reason: z.string().min(3)
  }),
  z.object({ type: z.literal('revoke_grant'), grantId: z.string().uuid(), reason: z.string().min(3) }),
  z.object({ type: z.literal('trial_bonus'), credits: z.number().int().positive(), reason: z.string().min(3) }),
  z.object({ type: z.literal('reset_trial'), reason: z.string().min(3) }),
  z.object({ type: z.literal('revoke_device'), deviceId: z.string().uuid(), reason: z.string().min(3) }),
  z.object({ type: z.literal('logout_all'), reason: z.string().min(3) }),
  z.object({ type: z.literal('add_note'), note: z.string().min(1) }),
  z.object({ type: z.literal('update_note'), noteId: z.string().uuid(), note: z.string().min(1) }),
  z.object({ type: z.literal('add_tag'), tag: z.string().min(1).max(40) }),
  z.object({ type: z.literal('remove_tag'), tag: z.string().min(1).max(40) }),
  z.object({ type: z.literal('add_fraud_flag'), flagType: z.enum(FRAUD_FLAG_TYPES), note: z.string().optional() }),
  z.object({ type: z.literal('set_role'), role: z.enum(ROLES), reason: z.string().min(3) }),
  z.object({ type: z.literal('delete'), reason: z.string().min(3) })
])

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const json = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_REQUEST', issues: parsed.error.issues }, { status: 400 })
  }

  const action = parsed.data
  const userId = params.id
  const { ipAddress, userAgent } = requestMeta(request)
  const supabase = ctx.supabase

  try {
    switch (action.type) {
      case 'block': {
        const { error } = await supabase.rpc('admin_block_user', {
          p_user_id: userId,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'unblock': {
        const { error } = await supabase.rpc('admin_unblock_user', {
          p_user_id: userId,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'grant_access': {
        const { error } = await supabase.rpc('admin_grant_access', {
          p_user_id: userId,
          p_grant_type: action.grantType,
          p_start_at: action.startAt,
          p_end_at: action.endAt,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'revoke_grant': {
        const { error } = await supabase.rpc('admin_revoke_grant', {
          p_grant_id: action.grantId,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'trial_bonus': {
        const { error } = await supabase.rpc('admin_add_trial_bonus', {
          p_user_id: userId,
          p_credits: action.credits,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'reset_trial': {
        const { error } = await supabase.rpc('admin_reset_trial', {
          p_user_id: userId,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'revoke_device': {
        const { error } = await supabase.rpc('admin_revoke_device', {
          p_device_id: action.deviceId,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'logout_all': {
        const { error } = await supabase.rpc('admin_logout_all_devices', {
          p_user_id: userId,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        // Best-effort: also try to invalidate live Supabase sessions (see
        // admin-actions/index.ts revokeSessions) — device revocation above
        // is what actually matters for this product's security boundary.
        await callAdminAction(supabase, 'revoke_sessions', { userId })
        break
      }
      case 'add_note': {
        const { error } = await supabase.rpc('admin_add_note', { p_user_id: userId, p_note: action.note })
        if (error) throw error
        break
      }
      case 'update_note': {
        const { error } = await supabase.rpc('admin_update_note', { p_note_id: action.noteId, p_note: action.note })
        if (error) throw error
        break
      }
      case 'add_tag': {
        const { error } = await supabase.rpc('admin_add_tag', { p_user_id: userId, p_tag: action.tag })
        if (error) throw error
        break
      }
      case 'remove_tag': {
        const { error } = await supabase.rpc('admin_remove_tag', { p_user_id: userId, p_tag: action.tag })
        if (error) throw error
        break
      }
      case 'add_fraud_flag': {
        const { error } = await supabase.rpc('admin_add_fraud_flag', {
          p_user_id: userId,
          p_flag_type: action.flagType,
          p_note: action.note ?? null
        })
        if (error) throw error
        break
      }
      case 'set_role': {
        const { error } = await supabase.rpc('admin_set_user_role', {
          p_user_id: userId,
          p_new_role: action.role,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
      case 'delete': {
        const { error } = await supabase.rpc('admin_soft_delete_user', {
          p_user_id: userId,
          p_reason: action.reason,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })
        if (error) throw error
        break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('RATE_LIMITED') ? 429 : 400
    return NextResponse.json({ error: 'ACTION_FAILED', message }, { status })
  }

  return NextResponse.json({ ok: true })
}
