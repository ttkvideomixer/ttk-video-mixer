import { QUIZ_QUESTIONS } from './quizQuestions'
import type { CreatorDiagnosis, ProfileType, QuizAnswers, ScoreKey, Scores } from '@/types/quiz'

const PROFILE_LABELS: Record<ProfileType, string> = {
  aceleracao: 'Creator em Aceleração',
  consistente: 'Creator Consistente',
  performance: 'Creator de Performance',
  escala: 'Creator em Escala',
  automatizador: 'Creator Automatizador',
  operacao_tiktok_shop: 'Operação TikTok Shop'
}

const FOCUS_LABELS: Record<ProfileType, string> = {
  aceleracao: 'Aceleração',
  consistente: 'Consistência',
  performance: 'Variação e testes',
  escala: 'Escala',
  automatizador: 'Automação',
  operacao_tiktok_shop: 'Escala total'
}

const BOTTLENECK_LABELS: Record<ScoreKey, string> = {
  volume: 'baixo volume de produção',
  consistency: 'falta de rotina e constância',
  variation: 'poucas variações testadas por produto',
  automation: 'tempo perdido em tarefas repetitivas de edição'
}

const OPPORTUNITY_LABELS: Record<ProfileType, string> = {
  aceleracao: 'gravar em blocos e deixar a combinação automática multiplicar seus primeiros vídeos',
  consistente: 'transformar sua rotina já existente em uma biblioteca maior de combinações',
  performance: 'testar muito mais Ganchos e CTAs sem regravar o Corpo inteiro',
  escala: 'organizar sua produção em uma esteira repetível em vez de editar vídeo por vídeo',
  automatizador: 'reduzir ainda mais o tempo manual delegando a montagem repetitiva ao Mixer',
  operacao_tiktok_shop: 'rodar uma esteira de produção combinatória entre vários produtos ao mesmo tempo'
}

const RECOMMENDATION_TIERS: Record<ProfileType, { hooks: number; bodies: number; ctas: number }> = {
  aceleracao: { hooks: 3, bodies: 3, ctas: 3 },
  consistente: { hooks: 3, bodies: 3, ctas: 3 },
  performance: { hooks: 5, bodies: 5, ctas: 5 },
  automatizador: { hooks: 5, bodies: 5, ctas: 5 },
  escala: { hooks: 10, bodies: 10, ctas: 10 },
  operacao_tiktok_shop: { hooks: 10, bodies: 10, ctas: 10 }
}

const SCORE_KEYS: ScoreKey[] = ['volume', 'consistency', 'variation', 'automation']

/** "Operação TikTok Shop" needs volume + variation + automation all high at once — consistency isn't part of that signal. */
const OPERATION_KEYS: ScoreKey[] = ['volume', 'variation', 'automation']

const HIGH_ACROSS_THE_BOARD_THRESHOLD = 6

export function computeScores(answers: QuizAnswers): Scores {
  const scores: Scores = { volume: 0, consistency: 0, variation: 0, automation: 0 }

  for (const question of QUIZ_QUESTIONS) {
    const chosenIndex = answers[question.key]
    if (!chosenIndex) continue
    const option = question.options.find((o) => o.index === chosenIndex)
    if (!option) continue
    for (const key of SCORE_KEYS) {
      scores[key] += option.scores[key] ?? 0
    }
  }

  return scores
}

export function isQuizComplete(answers: QuizAnswers): boolean {
  return QUIZ_QUESTIONS.every((q) => typeof answers[q.key] === 'number')
}

function pickDominantKey(scores: Scores): ScoreKey {
  return SCORE_KEYS.reduce((best, key) => (scores[key] > scores[best] ? key : best), SCORE_KEYS[0] as ScoreKey)
}

function pickWeakestKey(scores: Scores): ScoreKey {
  return SCORE_KEYS.reduce((worst, key) => (scores[key] < scores[worst] ? key : worst), SCORE_KEYS[0] as ScoreKey)
}

function classifyProfile(scores: Scores, answers: QuizAnswers): ProfileType {
  const allOperationSignalsHigh = OPERATION_KEYS.every((key) => scores[key] >= HIGH_ACROSS_THE_BOARD_THRESHOLD)
  if (allOperationSignalsHigh) return 'operacao_tiktok_shop'

  const dominant = pickDominantKey(scores)

  if (dominant === 'automation') return 'automatizador'
  if (dominant === 'variation') return 'performance'
  if (dominant === 'consistency') return 'consistente'

  // dominant === 'volume': tell apart "wants scale but isn't there yet" from
  // "already producing at high volume" using the raw answer to question 1 —
  // index 4/5 mean "6 a 10" / "mais de 10" (already high); index 6 ("quero
  // produzir muito mais") is aspirational, not a current-volume signal.
  const currentOutputAnswer = answers.q1 ?? 0
  const alreadyHighVolume = currentOutputAnswer === 4 || currentOutputAnswer === 5
  return alreadyHighVolume ? 'escala' : 'aceleracao'
}

function buildSummary(profile: ProfileType, focus: string, bottleneck: string): string {
  const focusSentence: Record<ProfileType, string> = {
    aceleracao:
      'Você quer produzir mais do que produz hoje, e o maior ganho está em transformar cada sessão de gravação em várias combinações.',
    consistente: 'Você já mantém um ritmo de produção e quer principalmente não perder essa constância.',
    performance: 'Você quer testar mais Ganchos, CTAs e ângulos diferentes para os mesmos produtos.',
    escala: 'Você já produz em volume alto e o gargalo passou a ser o tempo gasto montando cada vídeo manualmente.',
    automatizador: 'Você já usa ferramentas e automações, e quer reduzir ainda mais as tarefas repetitivas.',
    operacao_tiktok_shop: 'Sua operação já exige volume, variação e velocidade ao mesmo tempo, em vários produtos.'
  }

  return `${focusSentence[profile]} Seu maior gargalo hoje está relacionado a ${bottleneck}. Por isso, seu perfil combina especialmente com um fluxo de produção em blocos, em vez de editar vídeo por vídeo.`
}

export function diagnoseCreator(answers: QuizAnswers): CreatorDiagnosis {
  const scores = computeScores(answers)
  const profileType = classifyProfile(scores, answers)
  const bottleneckKey = pickWeakestKey(scores)
  const tier = RECOMMENDATION_TIERS[profileType]

  return {
    profileType,
    profileLabel: PROFILE_LABELS[profileType],
    scores,
    focus: FOCUS_LABELS[profileType],
    bottleneck: BOTTLENECK_LABELS[bottleneckKey],
    opportunity: OPPORTUNITY_LABELS[profileType],
    summary: buildSummary(profileType, FOCUS_LABELS[profileType], BOTTLENECK_LABELS[bottleneckKey]),
    recommendation:
      'Com o TTK VIDEO MIXER, você pode gravar vários Ganchos, Corpos e CTAs uma única vez e deixar o aplicativo criar as combinações automaticamente.',
    recommendedHooks: tier.hooks,
    recommendedBodies: tier.bodies,
    recommendedCtas: tier.ctas,
    recommendedTotal: tier.hooks * tier.bodies * tier.ctas
  }
}
