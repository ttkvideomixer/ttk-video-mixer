export const DEEP_LINK_SCHEME = 'videomixer'

export interface ParsedAuthCallback {
  code: string
}

/**
 * Validates and extracts the auth code from a `videomixer://auth/callback`
 * deep link. Rejects anything that doesn't match the exact expected
 * scheme/host/path (project rule: never open/act on an arbitrary deep
 * link — validate scheme, host, path, and required params).
 */
export function parseAuthCallbackUrl(rawUrl: string): ParsedAuthCallback | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol !== `${DEEP_LINK_SCHEME}:`) return null
  if (url.hostname !== 'auth') return null
  if (url.pathname !== '/callback') return null

  const code = url.searchParams.get('code')
  if (!code || code.trim().length === 0) return null

  return { code }
}

export interface ParsedAuthHandoff {
  token: string
}

/**
 * Validates a `videomixer://auth/handoff?token=...` deep link — the
 * website's "already have the app installed?" one-click login. The token
 * itself is opaque here; it only ever gets meaning server-side (see
 * redeem-desktop-handoff).
 */
export function parseAuthHandoffUrl(rawUrl: string): ParsedAuthHandoff | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol !== `${DEEP_LINK_SCHEME}:`) return null
  if (url.hostname !== 'auth') return null
  if (url.pathname !== '/handoff') return null

  const token = url.searchParams.get('token')
  if (!token || token.trim().length === 0) return null

  return { token }
}

/** Validates a `videomixer://billing/success` deep link — used only to refocus the window, never to grant access. */
export function isBillingSuccessUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  return url.protocol === `${DEEP_LINK_SCHEME}:` && url.hostname === 'billing' && url.pathname === '/success'
}
