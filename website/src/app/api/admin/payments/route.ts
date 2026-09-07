import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { toCsv, csvResponse } from '@/lib/admin/csv'

const CSV_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'user_id', label: 'Usuário' },
  { key: 'provider_event', label: 'Evento' },
  { key: 'status', label: 'Status' },
  { key: 'amount_cents', label: 'Valor (centavos)' },
  { key: 'created_at', label: 'Data' }
]

export async function GET(request: NextRequest): Promise<NextResponse | Response> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '25') || 25))
  const format = searchParams.get('format')

  let query = ctx.supabase.from('billing_events').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  if (format === 'csv') {
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })
    return csvResponse(toCsv(data ?? [], CSV_COLUMNS), 'pagamentos.csv')
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await query.range(from, to)
  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, pageSize })
}
