import { NextResponse } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'

export async function GET(): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('display_name, email, public_user_id')
    .eq('id', ctx.user.id)
    .single()

  return NextResponse.json({
    userId: ctx.user.id,
    role: ctx.role,
    email: profile?.email ?? ctx.user.email,
    displayName: profile?.display_name ?? null,
    publicUserId: profile?.public_user_id ?? null
  })
}
