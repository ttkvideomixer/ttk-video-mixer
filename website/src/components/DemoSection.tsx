'use client'

import { motion } from 'framer-motion'
import Reveal from './Reveal'

const FLOW = ['Adicionar Ganchos', 'Adicionar Corpos', 'Adicionar CTAs', 'Preview', 'Gerar', '1.000 outputs']

export default function DemoSection(): JSX.Element {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Veja em 20 segundos.</h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-bg-border bg-bg-card p-8 shadow-card">
            {FLOW.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-lg px-4 py-2.5 text-xs font-bold ${
                    i === FLOW.length - 1
                      ? 'bg-brand-gradient text-white shadow-glow'
                      : 'border border-bg-border bg-bg-soft text-gray-300'
                  }`}
                >
                  {step}
                </motion.span>
                {i < FLOW.length - 1 && <span className="text-gray-600">→</span>}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
