import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  email: z.string().email(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(4000),
  platform: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional()
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 })
  }

  const { email, subject, message, platform, appVersion } = parsed.data

  // user_id is derived server-side (support_tickets_set_user trigger reads
  // auth.uid()) — never trusted from this request body.
  const { error } = await supabase.from('support_tickets').insert({
    email,
    subject,
    message,
    platform: platform ?? null,
    app_version: appVersion ?? null
  })

  if (error) {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
