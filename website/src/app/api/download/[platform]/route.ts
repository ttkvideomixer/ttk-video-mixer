import { NextResponse, type NextRequest } from 'next/server'
import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { resolveDownload, type DownloadPlatform } from '@/lib/download'
import { findLocalWindowsInstaller } from '@/lib/devLocalInstaller'
import { getServerSupabaseClient } from '@/lib/supabase/server'

function isValidPlatform(value: string): value is DownloadPlatform {
  return value === 'windows' || value === 'macos'
}

async function recordDownloadEvent(platform: string): Promise<void> {
  try {
    const supabase = getServerSupabaseClient()
    if (!supabase) return
    await supabase.from('analytics_events').insert({ event_name: 'download_started', properties: { platform } })
  } catch {
    // Analytics must never block a real download.
  }
}

export async function GET(request: NextRequest, { params }: { params: { platform: string } }): Promise<NextResponse | Response> {
  const { platform } = params
  if (!isValidPlatform(platform)) {
    return NextResponse.redirect(new URL('/download?error=invalid_platform', request.url))
  }

  await recordDownloadEvent(platform)

  const resolved = await resolveDownload(platform)
  if (resolved.available) {
    // The repo is private, so resolved.url (GitHub's web UI link) 404s for an
    // anonymous browser. Fetch the asset server-side through the API asset
    // endpoint (which accepts a token) and stream it back to the visitor
    // instead of redirecting them straight to GitHub.
    const token = process.env.GITHUB_TOKEN?.trim()
    if (token) {
      const assetResponse = await fetch(resolved.assetApiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/octet-stream' }
      })
      if (assetResponse.ok && assetResponse.body) {
        return new Response(assetResponse.body, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(resolved.sizeBytes),
            'Content-Disposition': `attachment; filename="${resolved.fileName}"`
          }
        })
      }
    }
  }

  if (platform === 'windows') {
    const local = findLocalWindowsInstaller()
    if (local) {
      const stat = statSync(local.absolutePath)
      const stream = Readable.toWeb(createReadStream(local.absolutePath)) as ReadableStream
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-msdownload',
          'Content-Length': String(stat.size),
          'Content-Disposition': `attachment; filename="${local.fileName}"`
        }
      })
    }
  }

  return NextResponse.redirect(new URL(`/download?error=${platform}`, request.url))
}
