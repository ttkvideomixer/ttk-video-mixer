import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DownloadCard from '@/components/DownloadCard'
import { resolveDownload, formatBytes } from '@/lib/download'
import { findLocalWindowsInstaller } from '@/lib/devLocalInstaller'
import { getServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Download'
}

async function loadStatus() {
  const [windowsResolved, macosResolved] = await Promise.all([resolveDownload('windows'), resolveDownload('macos')])

  const windows = windowsResolved.available
    ? { available: true, version: windowsResolved.version, sizeLabel: formatBytes(windowsResolved.sizeBytes) }
    : (() => {
        const local = findLocalWindowsInstaller()
        return local ? { available: true, sizeLabel: formatBytes(local.sizeBytes) } : { available: false }
      })()

  const macos = macosResolved.available
    ? { available: true, version: macosResolved.version, sizeLabel: formatBytes(macosResolved.sizeBytes) }
    : { available: false }

  return { windows, macos }
}

export default async function DownloadPage({ searchParams }: { searchParams: { error?: string } }): Promise<JSX.Element> {
  const { windows, macos } = await loadStatus()

  const supabase = getServerSupabaseClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  const firstName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.split(' ')?.[0]

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              {user ? `Pronto${firstName ? `, ${firstName}` : ''}. Escolha seu sistema.` : 'Baixe o TTK VIDEO MIXER'}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-gray-400">
              Instale, entre com a mesma conta criada no site e seus 27 vídeos gratuitos estarão disponíveis.
            </p>
            {!user && (
              <Link href="/criar-conta" className="mt-4 inline-block text-sm font-semibold text-brand-light hover:underline">
                Ainda não tem conta? Criar conta e baixar →
              </Link>
            )}
          </div>

          {searchParams.error && (
            <div className="mx-auto mt-8 max-w-lg rounded-xl border border-error/40 bg-error/10 p-4 text-center text-sm text-error">
              Não conseguimos localizar esta versão.
              <Link href="/download" className="ml-2 underline">
                Tentar novamente
              </Link>
            </div>
          )}

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <DownloadCard
              platform="windows"
              title="Windows"
              subtitle="Windows 10/11 · 64-bit"
              available={windows.available}
              version={'version' in windows ? windows.version : undefined}
              sizeLabel={'sizeLabel' in windows ? windows.sizeLabel : undefined}
              recommended
            />
            <DownloadCard
              platform="macos"
              title="macOS"
              subtitle="Apple Silicon / Intel (universal)"
              available={macos.available}
              version={'version' in macos ? macos.version : undefined}
              sizeLabel={'sizeLabel' in macos ? macos.sizeLabel : undefined}
            />
          </div>

          <section id="instalacao" className="mt-16 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-bold text-white">Como instalar no Windows</h2>
              <ol className="mt-4 flex flex-col gap-2 text-sm text-gray-400">
                <li>1. Clique em Baixar para Windows.</li>
                <li>2. Abra o TTK Video Mixer Setup.exe.</li>
                <li>3. Siga o instalador.</li>
                <li>4. Abra o TTK VIDEO MIXER.</li>
                <li>5. Entre com a mesma conta criada no site.</li>
                <li>6. Seus 27 vídeos gratuitos estarão disponíveis.</li>
              </ol>
              <p className="mt-4 text-xs text-gray-500">
                Se o Windows mostrar um aviso do SmartScreen, confira se o arquivo foi baixado do site oficial do TTK
                VIDEO MIXER antes de continuar.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Como instalar no macOS</h2>
              <ol className="mt-4 flex flex-col gap-2 text-sm text-gray-400">
                <li>1. Baixe o arquivo .dmg.</li>
                <li>2. Abra o arquivo.</li>
                <li>3. Arraste o TTK VIDEO MIXER para Aplicativos.</li>
                <li>4. Abra o aplicativo.</li>
                <li>5. Entre com sua conta.</li>
                <li>6. Seus 27 vídeos gratuitos estarão disponíveis.</li>
              </ol>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
