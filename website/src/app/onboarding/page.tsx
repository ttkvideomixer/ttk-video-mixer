'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/components/AuthProvider'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { getOnboardingRow, saveOnboardingAnswer, completeOnboarding } from '@/lib/onboardingRepository'
import { QUIZ_QUESTIONS, TOTAL_QUESTIONS, getQuestionByNumber } from '@/lib/quizQuestions'
import { diagnoseCreator } from '@/lib/creatorProfileEngine'
import { track } from '@/lib/analytics'
import type { QuizAnswers } from '@/types/quiz'
import QuizProgress from '@/components/quiz/QuizProgress'
import QuizQuestionCard from '@/components/quiz/QuizQuestionCard'
import AnalyzingProfile from '@/components/quiz/AnalyzingProfile'

type Phase = 'loading' | 'intro' | 'quiz' | 'analyzing'

const ANSWER_ADVANCE_DELAY_MS = 750
const ANALYZING_DURATION_MS = 2600

export default function OnboardingPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Carregando...</div>}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent(): JSX.Element {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redo = searchParams.get('redo') === '1'

  const [phase, setPhase] = useState<Phase>('loading')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?next=/onboarding')
      return
    }

    const supabase = getBrowserSupabaseClient()
    if (!supabase) {
      setLoadError('O quiz ainda não está disponível neste ambiente (Supabase não configurado).')
      return
    }

    getOnboardingRow(supabase, user.id)
      .then((row) => {
        if (row?.completed_at && !redo) {
          router.replace('/onboarding/resultado')
          return
        }

        const existing: QuizAnswers = row
          ? { q1: row.q1 ?? undefined, q2: row.q2 ?? undefined, q3: row.q3 ?? undefined, q4: row.q4 ?? undefined, q5: row.q5 ?? undefined, q6: row.q6 ?? undefined, q7: row.q7 ?? undefined }
          : {}
        setAnswers(existing)

        const firstUnanswered = QUIZ_QUESTIONS.find((q) => existing[q.key] === undefined)
        setQuestionNumber(redo ? 1 : firstUnanswered?.number ?? 1)
        setPhase('intro')
      })
      .catch(() => setLoadError('Não foi possível carregar seu progresso do quiz agora.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, redo])

  const startQuiz = (): void => {
    track('quiz_started')
    setPhase('quiz')
  }

  const runDiagnosisAndFinish = async (finalAnswers: QuizAnswers): Promise<void> => {
    setPhase('analyzing')
    const supabase = getBrowserSupabaseClient()
    const diagnosis = diagnoseCreator(finalAnswers)

    if (supabase && user) {
      try {
        await completeOnboarding(supabase, user.id, diagnosis)
      } catch {
        // Non-fatal: the result page recomputes the diagnosis from the same
        // answers, so a failed write here doesn't strand the user.
      }
    }

    track('quiz_completed', { profileType: diagnosis.profileType })
    setTimeout(() => router.push('/onboarding/resultado'), ANALYZING_DURATION_MS)
  }

  const handleSelect = (index: number): void => {
    const question = getQuestionByNumber(questionNumber)
    if (!question) return

    const option = question.options.find((o) => o.index === index)
    const nextAnswers: QuizAnswers = { ...answers, [question.key]: index }
    setAnswers(nextAnswers)
    setFeedback(option?.feedback ?? null)
    track('quiz_question_answered', { question: question.number, answer: index })

    const supabase = getBrowserSupabaseClient()
    if (supabase && user) {
      saveOnboardingAnswer(supabase, user.id, question.key, index).catch(() => undefined)
    }

    setTimeout(() => {
      setFeedback(null)
      if (question.number >= TOTAL_QUESTIONS) {
        runDiagnosisAndFinish(nextAnswers)
      } else {
        setQuestionNumber(question.number + 1)
      }
    }, ANSWER_ADVANCE_DELAY_MS)
  }

  const goBack = (): void => {
    if (questionNumber <= 1) return
    setFeedback(null)
    setQuestionNumber(questionNumber - 1)
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 text-center">
        <p className="max-w-sm text-sm text-gray-400">{loadError}</p>
      </div>
    )
  }

  const question = getQuestionByNumber(questionNumber)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.p key="loading" className="text-sm text-gray-500">
            Carregando...
          </motion.p>
        )}

        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-md text-center"
          >
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Vamos montar seu perfil de Creator.
            </h1>
            <p className="mt-3 text-sm text-gray-400">
              Responda 7 perguntas rápidas para entender como o TTK VIDEO MIXER pode entrar na sua rotina.
            </p>
            <button
              onClick={startQuiz}
              className="mt-8 rounded-xl bg-brand-gradient px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-glow hover:opacity-90"
            >
              Começar
            </button>
          </motion.div>
        )}

        {phase === 'quiz' && question && (
          <motion.div key="quiz" className="w-full">
            <QuizProgress current={questionNumber} total={TOTAL_QUESTIONS} />
            <div className="mt-8">
              <QuizQuestionCard
                question={question}
                selectedIndex={answers[question.key] ?? null}
                feedback={feedback}
                onSelect={handleSelect}
              />
            </div>
            {questionNumber > 1 && (
              <div className="mx-auto mt-6 max-w-lg text-center">
                <button onClick={goBack} className="text-xs text-gray-500 hover:text-gray-300">
                  ← Voltar
                </button>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzingProfile />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
