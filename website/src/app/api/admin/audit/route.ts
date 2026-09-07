import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const actionType = searchParams.get('actionType')
  const adminUserId = searchParams.get('adminUserId')
  const targetUserId = searchParams.get('targetUserId')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '50') || 50))

  let query = ctx.supabase.from('admin_audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (actionType) query = query.eq('action_type', actionType)
  if (adminUserId) query = query.eq('admin_user_id', adminUserId)
  if (targetUserId) query = query.eq('target_user_id', targetUserId)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await query.range(from, to)
  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, pageSize })
}
