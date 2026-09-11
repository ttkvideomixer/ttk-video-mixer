'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { useAuth } from '@/components/AuthProvider'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { getOnboardingRow } from '@/lib/onboardingRepository'
import { diagnoseCreator } from '@/lib/creatorProfileEngine'
import { getEntitlementSummary, type EntitlementSummary } from '@/lib/entitlement'
import type { CreatorDiagnosis } from '@/types/quiz'
import Header from '@/components/Header'
import ScoreBars from '@/components/quiz/ScoreBars'

export default function OnboardingResultPage(): JSX.Element {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [diagnosis, setDiagnosis] = useState<CreatorDiagnosis | null>(null)
  const [entitlement, setEntitlement] = useState<EntitlementSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?next=/onboarding/resultado')
      return
    }

    const supabase = getBrowserSupabaseClient()
    if (!supabase) {
      setError('Resultado indisponível neste ambiente (Supabase não configurado).')
      return
    }

    getOnboardingRow(supabase, user.id)
      .then((row) => {
        if (!row?.completed_at) {
          router.replace('/onboarding')
          return
        }
        setDiagnosis(
          diagnoseCreator({ q1: row.q1 ?? undefined, q2: row.q2 ?? undefined, q3: row.q3 ?? undefined, q4: row.q4 ?? undefined, q5: row.q5 ?? undefined, q6: row.q6 ?? undefined, q7: row.q7 ?? undefined })
        )
      })
      .catch(() => setError('Não foi possível carregar seu diagnóstico agora.'))

    getEntitlementSummary(supabase).then(setEntitlement)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  useEffect(() => {
    if (!diagnosis) return
    const duration = 1400
    const end = Date.now() + duration
    const frame = (): void => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#7c5cff', '#3b82f6', '#a48bff'] })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#7c5cff', '#3b82f6', '#a48bff'] })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [diagnosis])

  const firstName = user?.user_metadata?.full_name?.split(' ')?.[0] ?? undefined

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 text-center text-sm text-gray-400">{error}</div>
    )
  }

  if (!diagnosis) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Carregando seu diagnóstico...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="minimal" />
      <main className="flex flex-1 justify-center px-5 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Seu perfil está pronto{firstName ? `, ${firstName}` : ''}! 🎉
            </h1>
            <span className="mt-4 inline-block rounded-full bg-brand-gradient px-5 py-2 text-sm font-extrabold uppercase tracking-wide text-black shadow-glow">
              {diagnosis.profileLabel}
            </span>
          </div>

          <div className="mt-8 rounded-2xl border border-bg-border bg-bg-card p-6">
            <p className="text-sm text-gray-300">{diagnosis.summary}</p>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-lg bg-bg-soft p-3">
                <p className="text-gray-500">Seu foco</p>
                <p className="mt-1 font-bold text-white">{diagnosis.focus.toUpperCase()}</p>
              </div>
              <div className="rounded-lg bg-bg-soft p-3">
                <p className="text-gray-500">Gargalo</p>
                <p className="mt-1 font-bold text-white">Edição repetitiva</p>
              </div>
              <div className="rounded-lg bg-bg-soft p-3">
                <p className="text-gray-500">Oportunidade</p>
                <p className="mt-1 font-bold text-white">Produção em blocos</p>
              </div>
            </div>

            <div className="mt-6">
              <ScoreBars scores={diagnosis.scores} />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-bg-border bg-bg-card p-6">
            <h2 className="text-sm font-bold text-white">O TTK VIDEO MIXER combina com o seu momento.</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-gray-300">
              <li>✓ Trabalhar em lotes</li>
              <li>✓ Criar mais variações por produto</li>
              <li>✓ Construir uma biblioteca de vídeos</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">{diagnosis.recommendation}</p>

            <div className="mt-5 rounded-xl bg-bg-soft p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-gray-500">Seu fluxo recomendado</p>
              <p className="mt-1 text-sm font-semibold text-gray-200">
                {diagnosis.recommendedHooks} Ganchos × {diagnosis.recommendedBodies} Corpos × {diagnosis.recommendedCtas} CTAs
              </p>
              <p className="text-lg font-extrabold gradient-text">{diagnosis.recommendedTotal} combinações possíveis</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/5 p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-brand-light">Seu próximo passo</p>
            <p className="mt-2 text-3xl font-extrabold gradient-text">27 VÍDEOS GRÁTIS</p>
            <p className="mt-2 text-sm text-gray-400">
              {entitlement
                ? `Sua conta está pronta — ${entitlement.trialRemaining} de ${entitlement.trialTotal} vídeos grátis disponíveis.`
                : 'Sua conta está pronta.'}
            </p>
            <Link
              href="/download"
              className="mt-5 inline-block rounded-xl bg-brand-gradient px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-black shadow-glow hover:opacity-90"
            >
              Baixar TTK VIDEO MIXER
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/onboarding?redo=1" className="text-xs text-gray-500 hover:text-gray-300">
              Refazer diagnóstico
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
