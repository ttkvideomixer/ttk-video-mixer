import { NextResponse } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { callAdminAction } from '@/lib/admin/callEdgeFunction'
import { isSupabaseConfigured } from '@/lib/env'

export async function GET(): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const result = await callAdminAction(ctx.supabase, 'system_health')

  return NextResponse.json({
    website: { ok: isSupabaseConfigured() },
    backendError: result.ok ? null : result.message,
    backendChecks: result.ok ? (result.data as Record<string, { ok: boolean; detail?: string }>) : {}
  })
}
