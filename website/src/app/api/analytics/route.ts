import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  eventName: z.string().min(1).max(100),
  sessionId: z.string().max(100).optional(),
  properties: z.record(z.unknown()).optional()
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  // sendBeacon posts a Blob without a JSON content-type, so parse the raw
  // text ourselves instead of relying on request.json()'s content-type check.
  const raw = await request.text().catch(() => '')
  let json: unknown = null
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    json = null
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: true })
  }

  const { eventName, sessionId, properties } = parsed.data

  // Never let analytics failures surface as a broken UI — always 200.
  await supabase
    .from('analytics_events')
    .insert({ event_name: eventName, session_id: sessionId ?? null, properties: properties ?? {} })
    .then(
      () => undefined,
      () => undefined
    )

  return NextResponse.json({ ok: true })
}
