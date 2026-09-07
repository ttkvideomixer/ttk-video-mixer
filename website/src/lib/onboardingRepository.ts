import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreatorDiagnosis, QuizAnswers } from '@/types/quiz'

export interface OnboardingRow extends QuizAnswers {
  user_id: string
  profile_type: string | null
  score_volume: number
  score_consistency: number
  score_variation: number
  score_automation: number
  completed_at: string | null
}

export async function getOnboardingRow(supabase: SupabaseClient, userId: string): Promise<OnboardingRow | null> {
  const { data, error } = await supabase.from('creator_onboarding').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as OnboardingRow | null
}

export async function saveOnboardingAnswer(
  supabase: SupabaseClient,
  userId: string,
  questionKey: keyof QuizAnswers,
  value: number
): Promise<void> {
  const { error } = await supabase.from('creator_onboarding').upsert({ user_id: userId, [questionKey]: value }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function completeOnboarding(supabase: SupabaseClient, userId: string, diagnosis: CreatorDiagnosis): Promise<void> {
  const { error } = await supabase
    .from('creator_onboarding')
    .upsert(
      {
        user_id: userId,
        profile_type: diagnosis.profileType,
        score_volume: diagnosis.scores.volume,
        score_consistency: diagnosis.scores.consistency,
        score_variation: diagnosis.scores.variation,
        score_automation: diagnosis.scores.automation,
        completed_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}
