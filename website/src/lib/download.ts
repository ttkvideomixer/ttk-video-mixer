export type DownloadPlatform = 'windows' | 'macos'

export interface GithubReleaseAsset {
  name: string
  url: string
  browser_download_url: string
  size: number
}

export interface GithubRelease {
  tag_name: string
  prerelease: boolean
  draft: boolean
  assets: GithubReleaseAsset[]
}

export interface ResolvedDownload {
  available: true
  platform: DownloadPlatform
  /** Web UI link — human-facing only, not fetchable without a GitHub session on a private repo. */
  url: string
  /** GitHub API asset endpoint — fetchable server-side with a token + Accept: application/octet-stream, works for private repos. */
  assetApiUrl: string
  version: string
  sizeBytes: number
  fileName: string
}

export interface UnresolvedDownload {
  available: false
  platform: DownloadPlatform
  reason: 'not_configured' | 'no_matching_asset' | 'fetch_failed'
}

export type DownloadResolution = ResolvedDownload | UnresolvedDownload

const ASSET_PATTERNS: Record<DownloadPlatform, RegExp> = {
  windows: /\.exe$/i,
  macos: /\.dmg$/i
}

/**
 * Pure matching logic, kept separate from the network call so it can be unit
 * tested without mocking `fetch`. Never invents a URL — if nothing in the
 * asset list matches the platform's extension, the caller must treat the
 * download as unavailable rather than fabricating one (project rule: no
 * fake download buttons for a build that doesn't exist yet).
 */
export function matchAssetForPlatform(
  release: Pick<GithubRelease, 'tag_name' | 'assets'>,
  platform: DownloadPlatform
): ResolvedDownload | null {
  const pattern = ASSET_PATTERNS[platform]
  const asset = release.assets.find((a) => pattern.test(a.name))
  if (!asset) return null

  return {
    available: true,
    platform,
    url: asset.browser_download_url,
    assetApiUrl: asset.url,
    version: release.tag_name,
    sizeBytes: asset.size,
    fileName: asset.name
  }
}

export function pickLatestStableRelease(releases: GithubRelease[]): GithubRelease | null {
  return releases.find((r) => !r.prerelease && !r.draft) ?? null
}

/**
 * Shared by resolveDownload (website /download buttons) and the
 * /api/update/[platform] auto-update feed — both need the SAME latest
 * stable release's asset list, just matched differently (by platform
 * extension vs. by exact update-manifest filename).
 */
export async function fetchLatestStableRelease(): Promise<GithubRelease | null> {
  const repo = process.env.GITHUB_REPOSITORY?.trim()
  if (!repo) return null

  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, {
    headers,
    next: { revalidate: 300 }
  })
  if (!response.ok) return null

  const releases = (await response.json()) as GithubRelease[]
  return pickLatestStableRelease(releases)
}

export async function resolveDownload(platform: DownloadPlatform): Promise<DownloadResolution> {
  const repo = process.env.GITHUB_REPOSITORY?.trim()
  if (!repo) return { available: false, platform, reason: 'not_configured' }

  try {
    const latest = await fetchLatestStableRelease()
    if (!latest) return { available: false, platform, reason: 'no_matching_asset' }

    const matched = matchAssetForPlatform(latest, platform)
    return matched ?? { available: false, platform, reason: 'no_matching_asset' }
  } catch {
    return { available: false, platform, reason: 'fetch_failed' }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const megabytes = bytes / (1024 * 1024)
  if (megabytes >= 1024) return `${(megabytes / 1024).toFixed(1)} GB`
  return `${megabytes.toFixed(0)} MB`
}
