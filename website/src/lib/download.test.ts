import { describe, expect, it } from 'vitest'
import { matchAssetForPlatform, pickLatestStableRelease, formatBytes, type GithubRelease } from './download'

const windowsAsset = {
  name: 'TTK-Video-Mixer-Setup-1.2.0.exe',
  url: 'https://api.github.com/repos/owner/repo/releases/assets/1',
  browser_download_url: 'https://example.com/win.exe',
  size: 123
}
const macAsset = {
  name: 'TTK-Video-Mixer-1.2.0-universal.dmg',
  url: 'https://api.github.com/repos/owner/repo/releases/assets/2',
  browser_download_url: 'https://example.com/mac.dmg',
  size: 456
}

describe('matchAssetForPlatform', () => {
  it('finds the .exe asset for windows', () => {
    const result = matchAssetForPlatform({ tag_name: 'v1.2.0', assets: [windowsAsset, macAsset] }, 'windows')
    expect(result).toEqual({
      available: true,
      platform: 'windows',
      url: windowsAsset.browser_download_url,
      assetApiUrl: windowsAsset.url,
      version: 'v1.2.0',
      sizeBytes: 123,
      fileName: windowsAsset.name
    })
  })

  it('finds the .dmg asset for macos', () => {
    const result = matchAssetForPlatform({ tag_name: 'v1.2.0', assets: [windowsAsset, macAsset] }, 'macos')
    expect(result?.fileName).toBe(macAsset.name)
  })

  it('returns null instead of inventing a link when no asset matches', () => {
    const result = matchAssetForPlatform({ tag_name: 'v1.2.0', assets: [windowsAsset] }, 'macos')
    expect(result).toBeNull()
  })
})

describe('pickLatestStableRelease', () => {
  const stable: GithubRelease = { tag_name: 'v1.0.0', prerelease: false, draft: false, assets: [] }
  const pre: GithubRelease = { tag_name: 'v1.1.0-beta', prerelease: true, draft: false, assets: [] }
  const draft: GithubRelease = { tag_name: 'v1.2.0', prerelease: false, draft: true, assets: [] }

  it('skips prereleases and drafts', () => {
    expect(pickLatestStableRelease([pre, draft, stable])).toBe(stable)
  })

  it('returns null when nothing stable exists', () => {
    expect(pickLatestStableRelease([pre, draft])).toBeNull()
  })
})

describe('formatBytes', () => {
  it('formats megabytes', () => {
    expect(formatBytes(120 * 1024 * 1024)).toBe('120 MB')
  })

  it('formats gigabytes once over 1024MB', () => {
    expect(formatBytes(1536 * 1024 * 1024)).toBe('1.5 GB')
  })
})
