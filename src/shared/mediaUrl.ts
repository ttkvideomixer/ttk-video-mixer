/**
 * Converts an absolute Windows path into a URL the renderer can load in an
 * <video>/<img> tag. We can't use plain `file://` here: in dev mode the
 * renderer's own origin is `http://localhost:5173` (the Vite dev server),
 * and Chromium refuses to load `file://` resources from an http(s) page
 * for security reasons — so the video would silently fail to load. The
 * `vmfile:` scheme is a custom protocol registered in the main process
 * (see main/mediaProtocol.ts) specifically to avoid that restriction, and
 * works identically in dev and in the packaged app.
 */
export function toMediaUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return `vmfile:///${normalized}`
}
