'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { QuizQuestion } from '@/types/quiz'

interface Props {
  question: QuizQuestion
  selectedIndex: number | null
  feedback: string | null
  onSelect: (index: number) => void
  onNext: () => void
  isLastQuestion: boolean
}

export default function QuizQuestionCard({
  question,
  selectedIndex,
  feedback,
  onSelect,
  onNext,
  isLastQuestion
}: Props): JSX.Element {
  return (
    <motion.div
      key={question.number}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35 }}
      className="mx-auto w-full max-w-lg"
    >
      <h2 className="text-center text-xl font-extrabold tracking-tight text-white md:text-2xl">{question.question}</h2>

      <div className="mt-6 grid gap-3">
        {question.options.map((option) => {
          const isSelected = selectedIndex === option.index
          return (
            <button
              key={option.index}
              onClick={() => onSelect(option.index)}
              className={`rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition ${
                isSelected
                  ? 'border-brand bg-brand/10 text-white'
                  : 'border-bg-border bg-bg-card text-gray-200 hover:border-brand/40 hover:bg-bg-soft'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5"
          >
            <p className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-center text-sm text-brand-light">
              {feedback}
            </p>
            <button
              onClick={onNext}
              className="mt-4 w-full rounded-xl bg-brand-gradient px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-glow hover:opacity-90"
            >
              {isLastQuestion ? 'Ver resultado' : 'Seguinte'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
