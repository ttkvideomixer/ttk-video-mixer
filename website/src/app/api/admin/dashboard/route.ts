import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { resolvePeriod, previousPeriod, type PeriodPreset } from '@/lib/admin/periods'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const preset = (searchParams.get('period') as PeriodPreset) || 'last30'
  const compare = searchParams.get('compare') === '1'
  const customFrom = searchParams.get('from')
  const customTo = searchParams.get('to')

  let range
  try {
    range = resolvePeriod(
      preset,
      new Date(),
      preset === 'custom' && customFrom && customTo ? { from: new Date(customFrom), to: new Date(customTo) } : undefined
    )
  } catch {
    return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 })
  }

  const { data: current, error } = await ctx.supabase.rpc('admin_dashboard_metrics', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString()
  })

  if (error) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })
  }

  let previous: unknown = null
  if (compare) {
    const prevRange = previousPeriod(range)
    const { data } = await ctx.supabase.rpc('admin_dashboard_metrics', {
      p_from: prevRange.from.toISOString(),
      p_to: prevRange.to.toISOString()
    })
    previous = data ?? null
  }

  const timeseries = await buildRevenueTimeseries(ctx.supabase, range.from, range.to)

  return NextResponse.json({ current, previous, timeseries })
}

interface BillingEventRow {
  created_at: string
  status: string | null
  amount_cents: number | null
  provider_event: string
}

async function buildRevenueTimeseries(
  supabase: SupabaseClient,
  from: Date,
  to: Date
): Promise<{ bucket: string; gross: number; refunds: number; newSubscriptions: number; renewals: number; pix: number; card: number }[]> {
  const { data } = await supabase
    .from('billing_events')
    .select('created_at, status, amount_cents, provider_event')
    .in('status', ['paid', 'refunded'])
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  const spanMs = to.getTime() - from.getTime()
  const hourly = spanMs <= 36 * 60 * 60 * 1000
  const buckets = new Map<string, { gross: number; refunds: number; newSubscriptions: number; renewals: number; pix: number; card: number }>()

  for (const row of (data ?? []) as BillingEventRow[]) {
    const date = new Date(row.created_at)
    const key = hourly
      ? `${date.toISOString().slice(0, 13)}:00`
      : date.toISOString().slice(0, 10)

    const bucket = buckets.get(key) ?? { gross: 0, refunds: 0, newSubscriptions: 0, renewals: 0, pix: 0, card: 0 }
    if (row.status === 'paid') {
      bucket.gross += row.amount_cents ?? 0
      if (row.provider_event === 'order.paid') bucket.pix += row.amount_cents ?? 0
      else bucket.card += row.amount_cents ?? 0
    }
    if (row.status === 'refunded') bucket.refunds += row.amount_cents ?? 0
    buckets.set(key, bucket)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([bucket, values]) => ({ bucket, ...values }))
}
