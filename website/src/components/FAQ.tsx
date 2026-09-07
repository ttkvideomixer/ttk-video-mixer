'use client'

import { useState } from 'react'
import Reveal from './Reveal'
import { track } from '@/lib/analytics'

const FAQS = [
  { q: 'O que é o TTK VIDEO MIXER?', a: 'Um software para combinar automaticamente Ganchos, Corpos e CTAs em vídeos prontos.' },
  { q: 'Preciso enviar meus vídeos para a nuvem?', a: 'Não para o processo de renderização. Os vídeos são processados localmente no seu computador.' },
  { q: 'Quantos vídeos posso testar gratuitamente?', a: 'Até 27 outputs gratuitos por usuário elegível (3 Ganchos × 3 Corpos × 3 CTAs).' },
  { q: 'Preciso cadastrar cartão?', a: 'Não, para utilizar o teste gratuito.' },
  { q: 'Funciona para TikTok Shop?', a: 'O fluxo foi pensado principalmente para creators que precisam produzir muitas variações de conteúdo.' },
  { q: 'Ele posta no TikTok automaticamente?', a: 'Atualmente o foco do aplicativo é a geração e organização dos vídeos, não a publicação automática.' },
  { q: 'Funciona em Windows?', a: 'Sim, o instalador para Windows está disponível na página de Download.' },
  { q: 'Funciona em Mac?', a: 'Sim, assim que uma build real para macOS estiver publicada — a página de Download mostra a disponibilidade em tempo real.' },
  { q: 'Quanto custa?', a: 'R$14,99/mês no plano TTK Video Mixer Pro, conforme a configuração comercial atual.' },
  { q: 'Posso cancelar?', a: 'Sim, o cancelamento pode ser feito a qualquer momento pela sua conta.' },
  { q: 'Os vídeos ficam no servidor?', a: 'Não — a renderização acontece localmente, no seu computador.' }
]

export default function FAQ(): JSX.Element {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="px-5 py-20">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Perguntas frequentes</h2>
        </Reveal>

        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="overflow-hidden rounded-xl border border-bg-border bg-bg-card">
                <button
                  onClick={() => {
                    const next = isOpen ? null : i
                    setOpen(next)
                    if (next !== null) track('faq_opened', { question: item.q })
                  }}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-white"
                >
                  {item.q}
                  <span className={`ml-4 text-gray-500 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
                </button>
                {isOpen && <p className="border-t border-bg-border px-5 py-4 text-sm text-gray-400">{item.a}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
