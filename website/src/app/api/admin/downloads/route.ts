import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { resolvePeriod, type PeriodPreset } from '@/lib/admin/periods'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { searchParams } = new URL(request.url)
  const preset = (searchParams.get('period') as PeriodPreset) || 'last30'
  let range
  try {
    range = resolvePeriod(preset, new Date())
  } catch {
    return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 })
  }

  const { data, error } = await ctx.supabase
    .from('analytics_events')
    .select('properties, user_id, created_at')
    .eq('event_name', 'download_started')
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  const rows = data ?? []
  const windows = rows.filter((r) => (r.properties as Record<string, unknown>)?.platform === 'windows').length
  const macos = rows.filter((r) => (r.properties as Record<string, unknown>)?.platform === 'macos').length
  const loggedIn = rows.filter((r) => r.user_id !== null).length
  const anonymous = rows.length - loggedIn

  return NextResponse.json({
    total: rows.length,
    windows,
    macos,
    loggedIn,
    anonymous,
    recent: rows.slice(0, 100)
  })
}
