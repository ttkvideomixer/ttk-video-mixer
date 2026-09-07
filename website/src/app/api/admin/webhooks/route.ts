import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const onlyErrors = searchParams.get('errors') === '1'

  let query = ctx.supabase
    .from('payment_webhook_events')
    .select('provider_event_id, event_type, received_at, processed_at, last_error')
    .order('received_at', { ascending: false })
    .limit(200)

  if (onlyErrors) query = query.not('last_error', 'is', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [] })
}
