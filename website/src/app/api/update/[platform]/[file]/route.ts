import { NextResponse, type NextRequest } from 'next/server'
import { fetchLatestStableRelease, type DownloadPlatform } from '@/lib/download'

/**
 * electron-updater's "generic" feed: it first GETs .../latest.yml (or
 * latest-mac.yml on macOS) to learn the newest version + installer
 * filename, then GETs that exact filename from the SAME base URL. The repo
 * is private, so — same reasoning as /api/download/[platform] — this
 * proxies both requests through GITHUB_TOKEN server-side instead of
 * pointing electron-updater straight at GitHub, which it can't authenticate
 * to on its own.
 */
function isValidPlatform(value: string): value is DownloadPlatform {
  return value === 'windows' || value === 'macos'
}

const MANIFEST_NAMES: Record<DownloadPlatform, string> = {
  windows: 'latest.yml',
  macos: 'latest-mac.yml'
}

export async function GET(_request: NextRequest, { params }: { params: { platform: string; file: string } }): Promise<Response> {
  const { platform, file } = params
  if (!isValidPlatform(platform)) return new NextResponse('Not found', { status: 404 })

  const token = process.env.GITHUB_TOKEN?.trim()
  if (!token) return new NextResponse('Update feed not configured', { status: 503 })

  const release = await fetchLatestStableRelease()
  if (!release) return new NextResponse('Not found', { status: 404 })

  const asset = release.assets.find((a) => a.name === file)
  if (!asset) return new NextResponse('Not found', { status: 404 })

  const assetResponse = await fetch(asset.url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/octet-stream' }
  })
  if (!assetResponse.ok || !assetResponse.body) return new NextResponse('Upstream error', { status: 502 })

  const isManifest = file === MANIFEST_NAMES[platform]
  return new Response(assetResponse.body, {
    headers: {
      'Content-Type': isManifest ? 'text/yaml' : 'application/octet-stream',
      'Content-Length': String(asset.size),
      // electron-updater must always see the latest manifest — never a
      // cached stale version pointing at an old installer.
      'Cache-Control': isManifest ? 'no-store' : 'public, max-age=3600'
    }
  })
}
