import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'

export const MEDIA_PROTOCOL_SCHEME = 'vmfile'

/**
 * Must run before `app.whenReady()` — Electron only accepts privileged
 * scheme registration at module load time.
 */
export function registerMediaProtocolAsPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_PROTOCOL_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: true,
        corsEnabled: true
      }
    }
  ])
}

/**
 * Serves local video/image files (hooks, bodies, ctas, generated previews)
 * through the custom `vmfile://` scheme instead of `file://`. Using
 * `net.fetch` on the equivalent `file://` URL preserves Range-request
 * support, so seeking/scrubbing in a long video still works.
 */
export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_PROTOCOL_SCHEME, (request) => {
    const url = new URL(request.url)
    let filePath = decodeURIComponent(url.pathname)
    if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1)
    return net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers })
  })
}
