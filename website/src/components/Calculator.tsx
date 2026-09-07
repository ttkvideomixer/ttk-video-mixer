'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Reveal from './Reveal'
import AnimatedNumber from './AnimatedNumber'
import { calculateCombinations, getCombinationMilestone, MILESTONE_MESSAGES } from '@/lib/combinations'

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand"
        aria-label={label}
      />
    </div>
  )
}

export default function Calculator(): JSX.Element {
  const [hooks, setHooks] = useState(10)
  const [bodies, setBodies] = useState(10)
  const [ctas, setCtas] = useState(10)

  const total = useMemo(() => calculateCombinations(hooks, bodies, ctas), [hooks, bodies, ctas])
  const milestone = getCombinationMilestone(total)

  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Quantos vídeos você pode criar?
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 rounded-3xl border border-bg-border bg-bg-card p-8 shadow-card">
            <div className="flex flex-col gap-6">
              <Slider label="Ganchos" value={hooks} onChange={setHooks} />
              <Slider label="Corpos" value={bodies} onChange={setBodies} />
              <Slider label="CTAs" value={ctas} onChange={setCtas} />
            </div>

            <div className="mt-8 flex flex-col items-center gap-1 border-t border-bg-border pt-6 text-center">
              <p className="text-xs uppercase tracking-widest text-gray-500">
                {hooks} × {bodies} × {ctas}
              </p>
              <p className="text-4xl font-extrabold gradient-text">
                <AnimatedNumber value={total} /> combinações
              </p>
              {milestone && <p className="mt-2 text-sm font-semibold text-brand-light">{MILESTONE_MESSAGES[milestone]}</p>}
            </div>

            <Link
              href="/criar-conta"
              className="mt-6 block rounded-xl bg-brand-gradient px-6 py-3 text-center text-sm font-extrabold uppercase tracking-wide text-white shadow-glow hover:opacity-90"
            >
              Testar com 27 Vídeos Grátis
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
