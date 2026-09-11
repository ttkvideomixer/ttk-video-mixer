import { protocol } from 'electron'
import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { extname } from 'node:path'

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

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.avi': 'video/x-msvideo',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
}

export function resolveFilePathFromUrl(requestUrl: string): string {
  const url = new URL(requestUrl)
  let filePath = decodeURIComponent(url.pathname)
  if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1)
  return filePath
}

/**
 * Core request handler, split out from `protocol.handle` registration so it
 * can be exercised directly in tests with a plain Request — no Electron
 * runtime required, since `Request`/`Response`/`ReadableStream` are all
 * standard Node/Web APIs.
 *
 * Explicit Range support is the whole point: without a proper 206 Partial
 * Content reply, Chromium's media engine treats the source as
 * non-seekable, and jumping to an unbuffered position in <video> silently
 * falls back to whatever's already downloaded (near the start) — which is
 * exactly what made the Preview timeline look like every seek "reset to
 * the beginning" no matter where it was dragged to. Streaming the exact
 * requested byte range via `createReadStream({ start, end })` is the
 * standard, well-established way to serve seekable local video (the same
 * approach any Node static-file/video server uses) — it doesn't depend on
 * whatever range behavior `net.fetch` happens to have for `file://` URLs.
 */
export async function handleMediaRequest(request: Request): Promise<Response> {
  const filePath = resolveFilePathFromUrl(request.url)

  let stat
  try {
    stat = statSync(filePath)
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const mimeType = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const rangeHeader = request.headers.get('range')

  if (!rangeHeader) {
    const stream = createReadStream(filePath)
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes'
      }
    })
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
  const start = match?.[1] ? Number(match[1]) : 0
  const end = match?.[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1
  const chunkSize = end - start + 1

  const stream = createReadStream(filePath, { start, end })
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    status: 206,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes'
    }
  })
}

/**
 * Serves local video/image files (hooks, bodies, ctas, generated previews)
 * through the custom `vmfile://` scheme instead of `file://`.
 */
export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_PROTOCOL_SCHEME, handleMediaRequest)
}
