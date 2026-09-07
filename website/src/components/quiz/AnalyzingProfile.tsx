'use client'

import { motion } from 'framer-motion'

const STEPS = ['Ritmo de produção', 'Necessidade de variações', 'Consistência', 'Volume', 'Potencial de automação']

export default function AnalyzingProfile(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <h2 className="text-xl font-extrabold text-white">Analisando seu perfil...</h2>
      <ul className="flex flex-col gap-2 text-left">
        {STEPS.map((step, i) => (
          <motion.li
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.4 }}
            className="flex items-center gap-2 text-sm text-gray-300"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.4 + 0.15 }}
              className="text-success"
            >
              ✓
            </motion.span>
            {step}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
