import { NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AdminRole = 'user' | 'support' | 'admin' | 'super_admin'

export interface AdminContext {
  supabase: SupabaseClient
  user: User
  role: AdminRole
}

const STAFF_ROLES: AdminRole[] = ['support', 'admin', 'super_admin']
const ADMIN_ROLES: AdminRole[] = ['admin', 'super_admin']

/**
 * Every /api/admin/* route calls this FIRST. It's defense in depth, not the
 * only line of defense — every table read is also gated by an `is_staff()`
 * RLS policy and every mutation goes through a SECURITY DEFINER RPC that
 * re-checks the role itself (see the admin_panel migration). A UI bug or a
 * missing call to this function could never expose data past what those two
 * layers already restrict.
 */
export async function requireStaff(): Promise<AdminContext | NextResponse> {
  return requireRole(STAFF_ROLES)
}

export async function requireAdminRole(): Promise<AdminContext | NextResponse> {
  return requireRole(ADMIN_ROLES)
}

export async function requireSuperAdmin(): Promise<AdminContext | NextResponse> {
  return requireRole(['super_admin'])
}

async function requireRole(allowed: AdminRole[]): Promise<AdminContext | NextResponse> {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 })
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (error || !profile) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const role = profile.role as AdminRole
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  return { supabase, user, role }
}

export function isAdminContext(value: AdminContext | NextResponse): value is AdminContext {
  return !(value instanceof NextResponse)
}

export function requestMeta(request: Request): { ipAddress: string | null; userAgent: string | null } {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return {
    ipAddress: forwardedFor ? forwardedFor.split(',')[0]?.trim() ?? null : null,
    userAgent: request.headers.get('user-agent')
  }
}
