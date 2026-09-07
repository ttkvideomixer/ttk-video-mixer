import { NextResponse } from 'next/server'
import { isAdminContext, requireStaff } from '@/lib/admin/requireAdmin'
import { QUIZ_QUESTIONS } from '@/lib/quizQuestions'

export async function GET(): Promise<NextResponse> {
  const ctx = await requireStaff()
  if (!isAdminContext(ctx)) return ctx

  const { data, error } = await ctx.supabase
    .from('creator_onboarding')
    .select('q1, q2, q3, q4, q5, q6, q7, profile_type')
    .not('completed_at', 'is', null)

  if (error) return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })

  const rows = data ?? []
  const total = rows.length

  const profileDistribution = new Map<string, number>()
  for (const row of rows) {
    const key = row.profile_type ?? 'desconhecido'
    profileDistribution.set(key, (profileDistribution.get(key) ?? 0) + 1)
  }

  const questionBreakdown = QUIZ_QUESTIONS.map((question) => {
    const answerCounts = new Map<number, number>()
    for (const row of rows) {
      const answer = (row as Record<string, unknown>)[question.key] as number | null
      if (answer) answerCounts.set(answer, (answerCounts.get(answer) ?? 0) + 1)
    }
    return {
      question: question.question,
      options: question.options.map((option) => ({
        label: option.label,
        count: answerCounts.get(option.index) ?? 0,
        percent: total === 0 ? 0 : Math.round(((answerCounts.get(option.index) ?? 0) / total) * 1000) / 10
      }))
    }
  })

  return NextResponse.json({
    totalCompleted: total,
    profileDistribution: Array.from(profileDistribution.entries()).map(([profileType, count]) => ({
      profileType,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 1000) / 10
    })),
    questionBreakdown
  })
}
