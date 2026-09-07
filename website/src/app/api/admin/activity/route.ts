import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

async function distinctActiveUsers(supabase: SupabaseClient, sinceIso: string): Promise<number> {
  const { data, error } = await supabase.from('generation_batches').select('user_id').gte('created_at', sinceIso)
  if (error || !data) return 0
  return new Set(data.map((r: { user_id: string }) => r.user_id)).size
}

/**
 * "Product-active" is defined as having at least one authorized generation
 * batch — a real usage event, not just opening the app (section 62).
 */
export async function GET(): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const [dau, wau, mau] = await Promise.all([
    distinctActiveUsers(ctx.supabase, daysAgoIso(1)),
    distinctActiveUsers(ctx.supabase, daysAgoIso(7)),
    distinctActiveUsers(ctx.supabase, daysAgoIso(30))
  ])

  const { count: neverGenerated } = await ctx.supabase
    .from('admin_users_overview')
    .select('user_id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('videos_generated', 0)

  return NextResponse.json({ dau, wau, mau, usersNeverGenerated: neverGenerated ?? null })
}
