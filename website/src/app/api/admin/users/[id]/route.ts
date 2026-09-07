import { NextResponse } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'

export async function GET(_request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const userId = params.id

  const [overview, subscriptions, billingEvents, devices, onboarding, notes, tags, grants, fraudFlags, auditLog, generationBatches] =
    await Promise.all([
      ctx.supabase.from('admin_users_overview').select('*').eq('user_id', userId).maybeSingle(),
      ctx.supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ctx.supabase.from('billing_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      ctx.supabase.from('devices').select('*').eq('user_id', userId).order('last_seen_at', { ascending: false }),
      ctx.supabase.from('creator_onboarding').select('*').eq('user_id', userId).maybeSingle(),
      ctx.supabase.from('admin_user_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ctx.supabase.from('admin_user_tags').select('*').eq('user_id', userId),
      ctx.supabase.from('access_grants').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ctx.supabase.from('fraud_flags').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ctx.supabase.from('admin_audit_log').select('*').eq('target_user_id', userId).order('created_at', { ascending: false }).limit(100),
      ctx.supabase.from('generation_batches').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    ])

  if (!overview.data) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  // Support role sees the same shape but with PII partially masked
  // (section 142) — never full email/tiktok for that role.
  const overviewData =
    ctx.role === 'support'
      ? { ...overview.data, email: maskEmail(overview.data.email), tiktok_username: null }
      : overview.data

  return NextResponse.json({
    overview: overviewData,
    subscriptions: subscriptions.data ?? [],
    billingEvents: billingEvents.data ?? [],
    devices: devices.data ?? [],
    onboarding: onboarding.data ?? null,
    notes: notes.data ?? [],
    tags: (tags.data ?? []).map((t) => t.tag),
    grants: grants.data ?? [],
    fraudFlags: fraudFlags.data ?? [],
    auditLog: auditLog.data ?? [],
    generationBatches: generationBatches.data ?? []
  })
}

function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain || !local) return email
  const visible = local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`
}
