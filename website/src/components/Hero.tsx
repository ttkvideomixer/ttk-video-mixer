'use client'

import Link from 'next/link'
import MixerAnimation from './MixerAnimation'
import HypeBadge from './HypeBadge'
import { track } from '@/lib/analytics'

export default function Hero(): JSX.Element {
  return (
    <section className="relative overflow-hidden bg-radial-fade px-5 pb-20 pt-16 md:pt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <HypeBadge className="mb-5" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-light">
            Criado para quem produz em escala
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            Grave 30 partes.
            <br />
            Transforme em até <span className="gradient-text">1.000 vídeos.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-gray-300">
            Combine Ganchos, Corpos e CTAs automaticamente e transforme sua produção de TikTok Shop em um fluxo muito
            mais rápido.
          </p>
          <p className="mt-2 text-sm text-gray-500">10 Ganchos × 10 Corpos × 10 CTAs = 1.000 combinações.</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/criar-conta"
              onClick={() => track('hero_cta_clicked', { cta: 'primary' })}
              className="rounded-xl bg-brand-gradient px-6 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide text-black shadow-glow hover:opacity-90"
            >
              Testar 27 Vídeos Grátis
            </Link>
            <a
              href="#como-funciona"
              onClick={() => track('hero_cta_clicked', { cta: 'secondary' })}
              className="rounded-xl border border-bg-border px-6 py-3.5 text-center text-sm font-bold text-gray-200 hover:bg-bg-soft"
            >
              Ver Como Funciona
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400">
            <li>✓ Sem cartão para testar</li>
            <li>✓ 27 vídeos grátis</li>
            <li>✓ Processamento no seu computador</li>
          </ul>
        </div>

        <MixerAnimation />
      </div>
    </section>
  )
}
