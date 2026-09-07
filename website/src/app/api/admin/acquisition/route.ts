import { NextResponse, type NextRequest } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { resolvePeriod, type PeriodPreset } from '@/lib/admin/periods'

interface SourceBucket {
  source: string
  signups: number
  downloads: number
}

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

  const { data: events, error } = await ctx.supabase
    .from('analytics_events')
    .select('event_name, properties')
    .in('event_name', ['signup_completed', 'download_started'])
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())

  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  const buckets = new Map<string, SourceBucket>()
  for (const event of events ?? []) {
    const props = (event.properties ?? {}) as Record<string, unknown>
    const source = (props.utm_source as string) || 'direto'
    const bucket = buckets.get(source) ?? { source, signups: 0, downloads: 0 }
    if (event.event_name === 'signup_completed') bucket.signups += 1
    if (event.event_name === 'download_started') bucket.downloads += 1
    buckets.set(source, bucket)
  }

  return NextResponse.json({ rows: Array.from(buckets.values()).sort((a, b) => b.signups - a.signups) })
}
