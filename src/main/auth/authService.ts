import { shell } from 'electron'
import { getSupabaseClient } from './supabaseClient'
import { setDeepLinkHandler } from '../deepLink'
import { parseAuthCallbackUrl } from '@shared/deepLink'
import type { AuthUser } from '@shared/billing'

const GOOGLE_OAUTH_TIMEOUT_MS = 5 * 60_000

function mapUser(user: { id: string; email?: string | null } | null): AuthUser | null {
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
  tiktokUsername: string | null
): Promise<{ user: AuthUser | null; needsEmailConfirmation: boolean }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        tiktok_username: normalizeTiktokUsername(tiktokUsername)
      }
    }
  })
  if (error) throw new Error(error.message)

  return { user: mapUser(data.user), needsEmailConfirmation: !data.session }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return mapUser(data.user)
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.auth.signOut()
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  return mapUser(data.session?.user ?? null)
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function sendPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'videomixer://auth/callback'
  })
  if (error) throw new Error(error.message)
}

export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

/**
 * Desktop OAuth: ask Supabase for the Google authorize URL (PKCE, no
 * browser redirect since we're not a web page), open it in the user's
 * default browser, then wait for the `videomixer://auth/callback` deep
 * link to come back with an authorization code and exchange it for a
 * session. `signInWithOAuth`'s PKCE code_verifier is stored via the same
 * encrypted storage as the session itself, so `exchangeCodeForSession`
 * picks it back up automatically.
 */
export function signInWithGoogle(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient()

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      setDeepLinkHandler(null)
      clearTimeout(timeout)
      fn()
    }

    const timeout = setTimeout(() => {
      finish(() => reject(new Error('Tempo esgotado aguardando o login com Google. Tente novamente.')))
    }, GOOGLE_OAUTH_TIMEOUT_MS)

    setDeepLinkHandler((url) => {
      const parsed = parseAuthCallbackUrl(url)
      if (!parsed) {
        finish(() => reject(new Error('Link de retorno de autenticação inválido.')))
        return
      }

      supabase.auth
        .exchangeCodeForSession(parsed.code)
        .then(({ data, error }) => {
          if (error) throw new Error(error.message)
          finish(() => resolve(mapUser(data.user)))
        })
        .catch((err: unknown) => {
          finish(() => reject(err instanceof Error ? err : new Error(String(err))))
        })
    })

    supabase.auth
      .signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'videomixer://auth/callback', skipBrowserRedirect: true }
      })
      .then(({ data, error }) => {
        if (error || !data.url) {
          finish(() => reject(new Error(error?.message ?? 'Não foi possível iniciar o login com Google.')))
          return
        }
        return shell.openExternal(data.url)
      })
      .catch((err: unknown) => {
        finish(() => reject(err instanceof Error ? err : new Error(String(err))))
      })
  })
}

/**
 * Redeems a `videomixer://auth/handoff?token=...` deep link: exchanges the
 * one-time token (from redeem-desktop-handoff) for a magic-link token_hash,
 * then verifies it locally to establish a real session — the user never
 * types a password, and this process never sees one either.
 */
export async function redeemDesktopHandoff(token: string): Promise<AuthUser | null> {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new Error('VITE_SUPABASE_URL não configurado.')

  const response = await fetch(`${url}/functions/v1/redeem-desktop-handoff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })

  const body = (await response.json().catch(() => ({}))) as { error?: { message?: string }; tokenHash?: string }
  if (!response.ok) {
    throw new Error(body.error?.message ?? 'Não foi possível concluir o login automático.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: body.tokenHash ?? '', type: 'magiclink' })
  if (error) throw new Error(error.message)

  return mapUser(data.user)
}

function normalizeTiktokUsername(input: string | null): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim().replace(/^@/, '')
  return trimmed.length > 0 ? trimmed : undefined
}
