import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminContext, requireAdminRole, requestMeta } from '@/lib/admin/requireAdmin'

export async function GET(): Promise<NextResponse> {
  const ctx = await requireAdminRole()
  if (!isAdminContext(ctx)) return ctx

  const { data, error } = await ctx.supabase
    .from('profiles')
    .select('id, public_user_id, display_name, email, role, created_at')
    .in('role', ['support', 'admin', 'super_admin'])
    .order('role', { ascending: false })

  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [] })
}

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['support', 'admin', 'super_admin']),
  reason: z.string().min(3)
})

/** Promotes an EXISTING user (by email) to a staff role — never creates a new account (section 216-218: no public admin signup). */
export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await requireAdminRole()
  if (!isAdminContext(ctx)) return ctx

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })

  const { data: target, error: findError } = await ctx.supabase.from('profiles').select('id').eq('email', parsed.data.email).maybeSingle()
  if (findError) return NextResponse.json({ error: 'SERVER_ERROR', message: findError.message }, { status: 500 })
  if (!target) return NextResponse.json({ error: 'USER_NOT_FOUND', message: 'Nenhuma conta encontrada com este e-mail. A pessoa precisa criar a conta normalmente primeiro.' }, { status: 404 })

  const { ipAddress, userAgent } = requestMeta(request)
  const { error } = await ctx.supabase.rpc('admin_set_user_role', {
    p_user_id: target.id,
    p_new_role: parsed.data.role,
    p_reason: parsed.data.reason,
    p_ip_address: ipAddress,
    p_user_agent: userAgent
  })

  if (error) {
    const status = error.message.includes('FORBIDDEN') ? 403 : 400
    return NextResponse.json({ error: 'ACTION_FAILED', message: error.message }, { status })
  }

  return NextResponse.json({ ok: true })
}
