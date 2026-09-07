import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminContext, requireAdminRole } from '@/lib/admin/requireAdmin'
import { callAdminAction } from '@/lib/admin/callEdgeFunction'

const schema = z.object({ amountCents: z.number().int().positive().optional(), reason: z.string().min(3) })

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const ctx = await requireAdminRole()
  if (!isAdminContext(ctx)) return ctx

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })

  const result = await callAdminAction(ctx.supabase, 'refund_payment', { billingEventId: params.id, ...parsed.data })
  if (!result.ok) return NextResponse.json({ error: 'ACTION_FAILED', message: result.message }, { status: result.status })

  return NextResponse.json(result.data)
}
