import { describe, expect, it } from 'vitest'
import { computeScores, diagnoseCreator, isQuizComplete } from './creatorProfileEngine'
import type { QuizAnswers } from '@/types/quiz'

describe('isQuizComplete', () => {
  it('is false until all 7 questions are answered', () => {
    expect(isQuizComplete({ q1: 1, q2: 2 })).toBe(false)
  })

  it('is true once all 7 are answered', () => {
    expect(isQuizComplete({ q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1 })).toBe(true)
  })
})

describe('diagnoseCreator', () => {
  it('classifies an aspirational-but-low-volume creator as aceleracao', () => {
    const answers: QuizAnswers = { q1: 6, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1, q7: 6 }
    expect(diagnoseCreator(answers).profileType).toBe('aceleracao')
  })

  it('classifies an already-high-volume creator as escala', () => {
    const answers: QuizAnswers = { q1: 5, q2: 2, q3: 2, q4: 1, q5: 1, q6: 1, q7: 6 }
    expect(diagnoseCreator(answers).profileType).toBe('escala')
  })

  it('classifies a variation-dominant creator as performance', () => {
    const answers: QuizAnswers = { q1: 1, q2: 5, q3: 5, q4: 3, q5: 5, q6: 5, q7: 3 }
    expect(diagnoseCreator(answers).profileType).toBe('performance')
  })

  it('classifies an automation-dominant creator as automatizador', () => {
    const answers: QuizAnswers = { q1: 4, q2: 3, q3: 5, q4: 2, q5: 6, q6: 4, q7: 2 }
    expect(diagnoseCreator(answers).profileType).toBe('automatizador')
  })

  it('classifies a consistency-dominant creator as consistente', () => {
    const answers: QuizAnswers = { q1: 3, q2: 4, q3: 2, q4: 4, q5: 1, q6: 1, q7: 5 }
    expect(diagnoseCreator(answers).profileType).toBe('consistente')
  })

  it('classifies volume+variation+automation all high as operacao_tiktok_shop', () => {
    const answers: QuizAnswers = { q1: 5, q2: 6, q3: 5, q4: 6, q5: 6, q6: 6, q7: 6 }
    expect(diagnoseCreator(answers).profileType).toBe('operacao_tiktok_shop')
  })

  it('never claims a scientific percentage or guaranteed outcome', () => {
    const answers: QuizAnswers = { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1 }
    const diagnosis = diagnoseCreator(answers)
    const fullText = `${diagnosis.summary} ${diagnosis.recommendation}`.toLowerCase()
    expect(fullText).not.toMatch(/%|garant|viraliza/)
  })

  it('recommends the 3x3x3=27 tier for the beginner profile', () => {
    const answers: QuizAnswers = { q1: 6, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1, q7: 6 }
    const diagnosis = diagnoseCreator(answers)
    expect(diagnosis.recommendedTotal).toBe(27)
  })

  it('recommends the 10x10x10=1000 tier for the scale profile', () => {
    const answers: QuizAnswers = { q1: 5, q2: 2, q3: 2, q4: 1, q5: 1, q6: 1, q7: 6 }
    const diagnosis = diagnoseCreator(answers)
    expect(diagnosis.recommendedTotal).toBe(1000)
  })
})

describe('computeScores', () => {
  it('ignores unanswered questions', () => {
    const scores = computeScores({ q1: 5 })
    expect(scores.volume).toBe(4)
    expect(scores.automation).toBe(1)
  })

  it('returns all zeros for no answers', () => {
    expect(computeScores({})).toEqual({ volume: 0, consistency: 0, variation: 0, automation: 0 })
  })
})
