export function calculateCombinations(hooks: number, bodies: number, ctas: number): number {
  const safeHooks = Math.max(0, Math.floor(hooks))
  const safeBodies = Math.max(0, Math.floor(bodies))
  const safeCtas = Math.max(0, Math.floor(ctas))
  return safeHooks * safeBodies * safeCtas
}

export type CombinationMilestone = 'lote' | 'biblioteca' | 'escala'

export function getCombinationMilestone(total: number): CombinationMilestone | null {
  if (total >= 1000) return 'escala'
  if (total >= 500) return 'biblioteca'
  if (total >= 100) return 'lote'
  return null
}

export const MILESTONE_MESSAGES: Record<CombinationMilestone, string> = {
  lote: 'Agora você está produzindo em lote.',
  biblioteca: 'Isso já é uma biblioteca de criativos.',
  escala: 'Bem-vindo à produção em escala.'
}
