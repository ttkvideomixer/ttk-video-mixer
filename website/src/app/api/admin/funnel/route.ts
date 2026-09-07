import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { resolvePeriod, type PeriodPreset } from '@/lib/admin/periods'

async function countEvent(supabase: SupabaseClient, eventName: string, from: string, to: string): Promise<number> {
  const { count } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', eventName)
    .gte('created_at', from)
    .lte('created_at', to)
  return count ?? 0
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
  const from = range.from.toISOString()
  const to = range.to.toISOString()

  const [pageViews, signupStarted, signupCompleted, quizStarted, quizCompleted, downloads, firstGenerations, subscriptions] =
    await Promise.all([
      countEvent(ctx.supabase, 'page_view', from, to),
      countEvent(ctx.supabase, 'signup_started', from, to),
      countEvent(ctx.supabase, 'signup_completed', from, to),
      countEvent(ctx.supabase, 'quiz_started', from, to),
      countEvent(ctx.supabase, 'quiz_completed', from, to),
      countEvent(ctx.supabase, 'download_started', from, to),
      ctx.supabase.from('generation_batches').select('user_id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
      ctx.supabase.from('subscriptions').select('*', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to)
    ])

  const steps = [
    { key: 'landing_visits', label: 'Visitantes na landing', count: pageViews },
    { key: 'signup_started', label: 'Cadastro iniciado', count: signupStarted },
    { key: 'signup_completed', label: 'Cadastro concluído', count: signupCompleted },
    { key: 'quiz_started', label: 'Quiz iniciado', count: quizStarted },
    { key: 'quiz_completed', label: 'Quiz concluído', count: quizCompleted },
    { key: 'downloads', label: 'Download', count: downloads },
    { key: 'first_generation', label: 'Primeira geração', count: firstGenerations.count ?? 0 },
    { key: 'subscriptions', label: 'Assinatura', count: subscriptions.count ?? 0 }
  ]

  const withConversion = steps.map((step, i) => ({
    ...step,
    conversionFromPrevious: i === 0 || steps[i - 1]!.count === 0 ? null : Math.round((step.count / steps[i - 1]!.count) * 1000) / 10
  }))

  return NextResponse.json({ steps: withConversion, periodFrom: from, periodTo: to })
}
