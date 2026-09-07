import { NextResponse } from 'next/server'
import { resolveDownload, formatBytes, type DownloadPlatform } from '@/lib/download'
import { findLocalWindowsInstaller } from '@/lib/devLocalInstaller'

export const dynamic = 'force-dynamic'

interface PlatformStatus {
  available: boolean
  version?: string
  sizeLabel?: string
  fileName?: string
  source: 'github' | 'local-dev' | 'unavailable'
}

async function statusFor(platform: DownloadPlatform): Promise<PlatformStatus> {
  const resolved = await resolveDownload(platform)
  if (resolved.available) {
    return {
      available: true,
      version: resolved.version,
      sizeLabel: formatBytes(resolved.sizeBytes),
      fileName: resolved.fileName,
      source: 'github'
    }
  }

  if (platform === 'windows') {
    const local = findLocalWindowsInstaller()
    if (local) {
      return { available: true, sizeLabel: formatBytes(local.sizeBytes), fileName: local.fileName, source: 'local-dev' }
    }
  }

  return { available: false, source: 'unavailable' }
}

export async function GET(): Promise<NextResponse> {
  const [windows, macos] = await Promise.all([statusFor('windows'), statusFor('macos')])
  return NextResponse.json({ windows, macos })
}
