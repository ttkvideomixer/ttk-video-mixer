import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { requireEnv } from './env.ts'

/**
 * Service-role client: full database access, bypasses RLS. Only ever used
 * inside Edge Functions (server), never shipped to the desktop app.
 */
export function getAdminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

/**
 * User-scoped client: RLS-enforced, acts as whoever owns the passed JWT.
 * Used so RPC calls like reserve_trial_generation resolve auth.uid()
 * correctly to the CALLING user — never a client-supplied user id.
 */
export function getUserClient(authHeader: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export interface AuthedUser {
  id: string
  email: string | null
}

/**
 * Verifies the caller's JWT and returns the authenticated user, or throws.
 * Never trust a user id sent in the request body — always resolve it from
 * the verified token, exactly like this.
 */
export async function requireAuthedUser(req: Request): Promise<{ user: AuthedUser; authHeader: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new HttpError(401, 'AUTH_REQUIRED', 'Missing Authorization header.')

  const admin = getAdminClient()
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Invalid or expired session.')

  return { user: { id: data.user.id, email: data.user.email ?? null }, authHeader }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}
