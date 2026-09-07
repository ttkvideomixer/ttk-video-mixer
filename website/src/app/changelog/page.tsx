import Header from '@/components/Header'
import Footer from '@/components/Footer'
import type { GithubRelease } from '@/lib/download'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Changelog' }

async function loadReleases(): Promise<(GithubRelease & { body?: string })[] | null> {
  const repo = process.env.GITHUB_REPOSITORY?.trim()
  if (!repo) return null

  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    const token = process.env.GITHUB_TOKEN?.trim()
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, { headers, next: { revalidate: 300 } })
    if (!response.ok) return null
    return (await response.json()) as (GithubRelease & { body?: string })[]
  } catch {
    return null
  }
}

export default async function ChangelogPage(): Promise<JSX.Element> {
  const releases = await loadReleases()
  const stable = releases?.filter((r) => !r.prerelease && !r.draft) ?? null

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-5 py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Changelog</h1>

          {!stable && (
            <p className="mt-6 text-sm text-gray-500">
              Ainda não há releases publicadas. Assim que a primeira versão for lançada, as notas aparecerão aqui
              automaticamente.
            </p>
          )}

          {stable && stable.length === 0 && (
            <p className="mt-6 text-sm text-gray-500">Nenhuma versão estável publicada ainda.</p>
          )}

          {stable && stable.length > 0 && (
            <div className="mt-8 flex flex-col gap-6">
              {stable.map((release) => (
                <div key={release.tag_name} className="rounded-2xl border border-bg-border bg-bg-card p-5">
                  <h2 className="text-sm font-bold text-white">{release.tag_name}</h2>
                  {release.body && <p className="mt-2 whitespace-pre-line text-xs text-gray-400">{release.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
