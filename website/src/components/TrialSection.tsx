import Link from 'next/link'
import Reveal from './Reveal'

export default function TrialSection(): JSX.Element {
  return (
    <section id="teste-gratis" className="px-5 py-20">
      <Reveal className="mx-auto max-w-3xl rounded-3xl border border-brand/40 bg-brand/5 p-8 text-center shadow-glow md:p-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Teste antes de assinar.</h2>

        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-gray-300">
          <span className="rounded-lg border border-bg-border bg-bg-card px-4 py-2">3 Ganchos</span>
          <span className="text-brand-light">×</span>
          <span className="rounded-lg border border-bg-border bg-bg-card px-4 py-2">3 Corpos</span>
          <span className="text-brand-light">×</span>
          <span className="rounded-lg border border-bg-border bg-bg-card px-4 py-2">3 CTAs</span>
          <span className="text-brand-light">=</span>
        </div>
        <p className="mt-5 text-4xl font-extrabold gradient-text">27 VÍDEOS GRÁTIS</p>

        <p className="mx-auto mt-4 max-w-md text-sm text-gray-400">
          Crie sua conta e teste o fluxo completo do TTK VIDEO MIXER.
        </p>

        <Link
          href="/criar-conta"
          className="mt-6 inline-block rounded-xl bg-brand-gradient px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-black shadow-glow hover:opacity-90"
        >
          Criar Conta Grátis
        </Link>
        <p className="mt-3 text-xs text-gray-500">Não precisa cadastrar cartão para testar.</p>
      </Reveal>
    </section>
  )
}
