export type ScoreKey = 'volume' | 'consistency' | 'variation' | 'automation'

export type Scores = Record<ScoreKey, number>

export interface QuizAnswerOption {
  index: number
  label: string
  feedback: string
  scores: Partial<Scores>
}

export interface QuizQuestion {
  number: number
  key: `q${1 | 2 | 3 | 4 | 5 | 6 | 7}`
  question: string
  options: [
    QuizAnswerOption,
    QuizAnswerOption,
    QuizAnswerOption,
    QuizAnswerOption,
    QuizAnswerOption,
    QuizAnswerOption
  ]
}

export type ProfileType =
  | 'aceleracao'
  | 'consistente'
  | 'performance'
  | 'escala'
  | 'automatizador'
  | 'operacao_tiktok_shop'

export interface QuizAnswers {
  q1?: number
  q2?: number
  q3?: number
  q4?: number
  q5?: number
  q6?: number
  q7?: number
}

export interface CreatorDiagnosis {
  profileType: ProfileType
  profileLabel: string
  scores: Scores
  focus: string
  bottleneck: string
  opportunity: string
  summary: string
  recommendation: string
  recommendedHooks: number
  recommendedBodies: number
  recommendedCtas: number
  recommendedTotal: number
}
