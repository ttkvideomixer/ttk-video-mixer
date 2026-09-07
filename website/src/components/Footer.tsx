import Link from 'next/link'

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/#preco', label: 'Preço' },
  { href: '/download', label: 'Download' },
  { href: '/login', label: 'Entrar' },
  { href: '/termos', label: 'Termos' },
  { href: '/privacidade', label: 'Privacidade' },
  { href: '/suporte', label: 'Suporte' }
]

export default function Footer(): JSX.Element {
  return (
    <footer className="border-t border-bg-border bg-bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-extrabold tracking-tight text-white">
            TTK <span className="text-brand-light">VIDEO MIXER</span>
          </p>
          <p className="mt-2 max-w-xs text-xs text-gray-500">
            Combine Ganchos, Corpos e CTAs automaticamente. Processamento local, sem enviar seus vídeos para a nuvem.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-gray-400 sm:grid-cols-3">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-gray-200">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-bg-border px-5 py-4 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} TTK Video Mixer. Todos os direitos reservados.
      </div>
    </footer>
  )
}
