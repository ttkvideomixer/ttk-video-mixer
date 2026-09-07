'use client'

import { motion } from 'framer-motion'
import Reveal from './Reveal'

const STEPS = [
  { n: 1, title: 'Grave seus Ganchos.', desc: 'As primeiras frases que prendem a atenção nos primeiros segundos.' },
  { n: 2, title: 'Grave os Corpos.', desc: 'A explicação principal do produto ou da ideia.' },
  { n: 3, title: 'Grave os CTAs.', desc: 'A chamada final para o espectador agir.' },
  { n: 4, title: 'O TTK VIDEO MIXER combina tudo.', desc: 'Cada Gancho, Corpo e CTA se combinam automaticamente em vídeos prontos.' }
]

function MixerMachineAnimation(): JSX.Element {
  const inputs = ['G', 'C', 'T', 'G', 'C', 'T']
  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center gap-4 py-4">
      <div className="flex flex-wrap justify-center gap-2">
        {inputs.map((letter, i) => (
          <motion.span
            key={`${letter}-${i}`}
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-bg-border bg-bg-soft text-xs font-bold text-gray-300"
          >
            {letter}
          </motion.span>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scaleY: 0.6 }}
        whileInView={{ opacity: 1, scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="flex h-16 w-40 items-center justify-center rounded-2xl bg-brand-gradient text-xs font-extrabold uppercase tracking-widest text-white shadow-glow"
      >
        Mixer
      </motion.div>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 + i * 0.08, duration: 0.4 }}
            className="rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand-light"
          >
            Vídeo #{100 + i}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

export default function HowItWorks(): JSX.Element {
  return (
    <section id="como-funciona" className="px-5 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Você não precisa gravar 1.000 vídeos.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-400">
            Grave as partes estratégicas uma vez e deixe o TTK VIDEO MIXER fazer as combinações.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-bg-border bg-bg-card p-5 transition hover:-translate-y-1 hover:border-brand/50">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-extrabold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 text-sm font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-xs text-gray-400">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <MixerMachineAnimation />
        </Reveal>
      </div>
    </section>
  )
}
