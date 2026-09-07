import Link from 'next/link'
import Reveal from './Reveal'

const PERKS = [
  'Geração ilimitada',
  'Todos os recursos',
  'Variações criativas',
  'CTA Visual',
  'Textos de Gancho',
  'Preview',
  'Novas atualizações incluídas conforme disponibilizadas'
]

export default function Pricing(): JSX.Element {
  return (
    <section id="preco" className="px-5 py-20">
      <div className="mx-auto max-w-md">
        <Reveal className="rounded-3xl border border-brand/50 bg-bg-card p-8 text-center shadow-glow">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-light">TTK Video Mixer Pro</p>
          <p className="mt-3 text-5xl font-extrabold text-white">
            R$14,99<span className="text-lg font-medium text-gray-400">/mês</span>
          </p>

          <ul className="mt-6 flex flex-col gap-2 text-left text-sm text-gray-300">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2">
                <span className="text-success">✓</span>
                {perk}
              </li>
            ))}
          </ul>

          <Link
            href="/criar-conta"
            className="mt-8 block rounded-xl bg-brand-gradient px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-glow hover:opacity-90"
          >
            Começar com 27 Vídeos Grátis
          </Link>
          <p className="mt-3 text-xs text-gray-500">Cancele quando quiser. Nenhuma cobrança antes do fim do teste.</p>
        </Reveal>
      </div>
    </section>
  )
}
