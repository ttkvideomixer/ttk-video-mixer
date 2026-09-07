import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { toCsv, csvResponse } from '@/lib/admin/csv'

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

const CSV_COLUMNS = [
  { key: 'public_user_id', label: 'ID TTK' },
  { key: 'display_name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'tiktok_username', label: 'TikTok' },
  { key: 'created_at', label: 'Cadastro' },
  { key: 'plan', label: 'Plano' },
  { key: 'status', label: 'Status' },
  { key: 'trial_used', label: 'Trial usado' },
  { key: 'trial_total', label: 'Trial total' },
  { key: 'current_period_end', label: 'Vencimento' },
  { key: 'videos_generated', label: 'Vídeos gerados' },
  { key: 'lifetime_revenue_cents', label: 'Receita histórica (centavos)' }
]

export async function GET(request: NextRequest): Promise<NextResponse | Response> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const plan = searchParams.get('plan')
  const status = searchParams.get('status')
  const blocked = searchParams.get('blocked')
  const hasGrant = searchParams.get('hasGrant')
  const hasDevice = searchParams.get('hasDevice')
  const trialExhausted = searchParams.get('trialExhausted') === '1'
  const sort = searchParams.get('sort') ?? 'created_desc'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE))
  const format = searchParams.get('format')

  let query = ctx.supabase.from('admin_users_overview').select('*', { count: 'exact' }).is('deleted_at', null)

  if (q) {
    query = query.or(
      `email.ilike.%${q}%,display_name.ilike.%${q}%,public_user_id.ilike.%${q}%,tiktok_username.ilike.%${q}%`
    )
  }
  if (plan) query = query.eq('plan', plan)
  if (status) query = query.eq('status', status)
  if (blocked === '1') query = query.not('blocked_at', 'is', null)
  if (blocked === '0') query = query.is('blocked_at', null)
  if (hasGrant === '1') query = query.eq('has_active_grant', true)
  if (hasDevice === '1') query = query.gt('active_device_count', 0)
  if (hasDevice === '0') query = query.eq('active_device_count', 0)

  switch (sort) {
    case 'created_asc':
      query = query.order('created_at', { ascending: true })
      break
    case 'revenue_desc':
      query = query.order('lifetime_revenue_cents', { ascending: false })
      break
    case 'videos_desc':
      query = query.order('videos_generated', { ascending: false })
      break
    case 'period_end_asc':
      query = query.order('current_period_end', { ascending: true, nullsFirst: false })
      break
    case 'created_desc':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  if (format === 'csv') {
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })
    let rows = data ?? []
    if (trialExhausted) rows = rows.filter((r) => r.trial_used >= r.trial_total)
    return csvResponse(toCsv(rows, CSV_COLUMNS), 'usuarios.csv')
  }

  // trialExhausted can't be expressed as a simple PostgREST column filter
  // (it compares two columns on the same row), so when it's active we
  // over-fetch this page's worth after filtering client-side in-memory on
  // the returned page — acceptable at this dataset size, revisited with a
  // dedicated computed column if the user base grows large enough to matter.
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await query.range(from, to)

  if (error) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })
  }

  const rows = trialExhausted ? (data ?? []).filter((r) => r.trial_used >= r.trial_total) : data ?? []

  return NextResponse.json({ rows, total: count ?? 0, page, pageSize })
}
