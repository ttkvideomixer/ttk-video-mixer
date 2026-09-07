import { app } from 'electron'
import { DEEP_LINK_SCHEME } from '@shared/deepLink'

let currentHandler: ((url: string) => void) | null = null

/**
 * Registers `videomixer://` as this app's protocol so Windows routes a
 * click on an OAuth/checkout redirect link back to us. Must run before
 * `app.whenReady()`. In dev mode (running via `electron .` against the
 * unpacked source, not an installed build) Windows can't launch us via a
 * bare protocol registration the same way, so we also pass argv[1] as the
 * script path — harmless in production, where `process.defaultApp` is
 * false and the simple form is used instead.
 */
export function registerDeepLinkProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [process.argv[1]])
    }
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
  }
}

/** Only one deep-link flow (Google OAuth, or a billing-success ping) is ever in flight at a time. */
export function setDeepLinkHandler(handler: ((url: string) => void) | null): void {
  currentHandler = handler
}

function dispatch(url: string): void {
  if (url.startsWith(`${DEEP_LINK_SCHEME}://`)) {
    currentHandler?.(url)
  }
}

/** Windows delivers the deep link as an argv entry, both on a fresh launch and via `second-instance`. */
export function extractDeepLinkFromArgv(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`)) ?? null
}

export function handleDeepLinkArgv(argv: string[]): void {
  const url = extractDeepLinkFromArgv(argv)
  if (url) dispatch(url)
}

/** macOS/Linux-style `open-url` event — kept for completeness even though Windows is the target platform. */
export function handleOpenUrl(url: string): void {
  dispatch(url)
}
