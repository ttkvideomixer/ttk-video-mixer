import Link from 'next/link'

export default function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-6xl font-extrabold gradient-text">404</p>
      <p className="text-sm text-gray-400">Essa página não existe ou foi movida.</p>
      <Link
        href="/"
        className="mt-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-glow hover:opacity-90"
      >
        Voltar ao TTK VIDEO MIXER
      </Link>
    </div>
  )
}
