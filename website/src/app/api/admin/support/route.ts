import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = ctx.supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(200)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [] })
}
