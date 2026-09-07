import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminContext, requireAdminRole } from '@/lib/admin/requireAdmin'
import { callAdminAction } from '@/lib/admin/callEdgeFunction'

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cancel'), immediately: z.boolean().optional(), reason: z.string().min(3) }),
  z.object({ type: z.literal('reactivate'), reason: z.string().min(3) }),
  z.object({ type: z.literal('reconcile') })
])

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const ctx = await requireAdminRole()
  if (!isAdminContext(ctx)) return ctx

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })

  const action = parsed.data
  const actionName =
    action.type === 'cancel' ? 'cancel_subscription' : action.type === 'reactivate' ? 'reactivate_subscription' : 'reconcile_subscription'

  const result = await callAdminAction(ctx.supabase, actionName, { subscriptionId: params.id, ...action })
  if (!result.ok) return NextResponse.json({ error: 'ACTION_FAILED', message: result.message }, { status: result.status })

  return NextResponse.json(result.data)
}
