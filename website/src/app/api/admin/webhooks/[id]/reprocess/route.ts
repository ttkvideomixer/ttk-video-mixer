import { NextResponse } from 'next/server'
import { isAdminContext, requireAdminRole } from '@/lib/admin/requireAdmin'
import { callAdminAction } from '@/lib/admin/callEdgeFunction'

export async function POST(_request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const ctx = await requireAdminRole()
  if (!isAdminContext(ctx)) return ctx

  const result = await callAdminAction(ctx.supabase, 'reprocess_webhook', { webhookEventId: params.id })
  if (!result.ok) return NextResponse.json({ error: 'ACTION_FAILED', message: result.message }, { status: result.status })

  return NextResponse.json(result.data)
}
