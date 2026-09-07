'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const COMBOS = [
  { hook: 'GANCHO 07', body: 'CORPO 03', cta: 'CTA 08', output: 'VÍDEO #738' },
  { hook: 'GANCHO 02', body: 'CORPO 09', cta: 'CTA 04', output: 'VÍDEO #294' },
  { hook: 'GANCHO 05', body: 'CORPO 01', cta: 'CTA 06', output: 'VÍDEO #512' }
]

function Chip({ label }: { label: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-soft px-4 py-3 text-center text-xs font-bold tracking-wide text-gray-200 shadow-card">
      {label}
    </div>
  )
}

export default function MixerAnimation(): JSX.Element {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % COMBOS.length), 2600)
    return () => clearInterval(interval)
  }, [])

  const combo = COMBOS[index] as (typeof COMBOS)[number]

  return (
    <div className="relative mx-auto w-full max-w-sm rounded-3xl border border-bg-border bg-bg-card p-6 shadow-card">
      <div className="absolute inset-0 -z-10 rounded-3xl bg-radial-fade" />
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <Chip label={combo.hook} />
          <span className="text-xl text-brand-light">×</span>
          <Chip label={combo.body} />
          <span className="text-xl text-brand-light">×</span>
          <Chip label={combo.cta} />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-500"
          >
            ↓
          </motion.span>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="w-full rounded-xl bg-brand-gradient px-4 py-3 text-center text-sm font-extrabold tracking-wide text-white shadow-glow"
          >
            {combo.output}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
