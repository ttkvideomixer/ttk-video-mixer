import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { toCsv, csvResponse } from '@/lib/admin/csv'

const CSV_COLUMNS = [
  { key: 'public_user_id', label: 'ID TTK' },
  { key: 'email', label: 'Email' },
  { key: 'payment_type', label: 'Método' },
  { key: 'reason', label: 'Motivo' },
  { key: 'last_paid_at', label: 'Último pagamento' },
  { key: 'lifetime_payment_count', label: 'Pagamentos' },
  { key: 'lifetime_revenue_cents', label: 'Receita histórica (centavos)' }
]

export async function GET(request: NextRequest): Promise<NextResponse | Response> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const reason = searchParams.get('reason')
  const paymentType = searchParams.get('paymentType')
  const format = searchParams.get('format')

  let query = ctx.supabase.from('admin_non_renewed_users').select('*').order('last_period_end', { ascending: false })
  if (reason) query = query.eq('reason', reason)
  if (paymentType) query = query.eq('payment_type', paymentType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  if (format === 'csv') return csvResponse(toCsv(data ?? [], CSV_COLUMNS), 'nao-renovaram.csv')

  return NextResponse.json({ rows: data ?? [] })
}
