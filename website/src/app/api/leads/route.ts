import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  email: z.string().email(),
  source: z.string().max(100).optional(),
  utmSource: z.string().max(200).nullable().optional(),
  utmMedium: z.string().max(200).nullable().optional(),
  utmCampaign: z.string().max(200).nullable().optional(),
  utmContent: z.string().max(200).nullable().optional(),
  utmTerm: z.string().max(200).nullable().optional()
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

  const { email, source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm } = parsed.data

  const { error } = await supabase.from('marketing_leads').upsert(
    {
      email,
      source: source ?? null,
      utm_source: utmSource ?? null,
      utm_medium: utmMedium ?? null,
      utm_campaign: utmCampaign ?? null,
      utm_content: utmContent ?? null,
      utm_term: utmTerm ?? null
    },
    { onConflict: 'email', ignoreDuplicates: false }
  )

  if (error) {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
