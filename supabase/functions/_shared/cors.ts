// Desktop app calls these functions with the Supabase JS client, which sends
// a standard preflight for non-simple requests. There is no browser origin
// to restrict to (the caller is the Electron main process, not a web page),
// so CORS here only needs to not block the Supabase client itself.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
