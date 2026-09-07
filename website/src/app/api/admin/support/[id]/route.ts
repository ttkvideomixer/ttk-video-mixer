import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'

const schema = z.object({ status: z.enum(['open', 'in_progress', 'closed']) })

export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })

  const { error } = await ctx.supabase.rpc('admin_update_ticket_status', { p_ticket_id: params.id, p_status: parsed.data.status })
  if (error) return NextResponse.json({ error: 'ACTION_FAILED', message: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
