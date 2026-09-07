export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom'

export interface PeriodRange {
  from: Date
  to: Date
}

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: '7 dias',
  last30: '30 dias',
  last90: '90 dias',
  thisMonth: 'Este mês',
  lastMonth: 'Mês passado',
  thisYear: 'Este ano',
  custom: 'Personalizado'
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'last90',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'custom'
]

export function periodLabel(preset: PeriodPreset): string {
  return PERIOD_LABELS[preset]
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Resolves a preset (or explicit custom range) into a concrete [from, to]
 * window, anchored to `now` so it's deterministic and testable.
 */
export function resolvePeriod(preset: PeriodPreset, now: Date, custom?: PeriodRange): PeriodRange {
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    }
    case 'last7': {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'last30': {
      const from = new Date(now)
      from.setDate(from.getDate() - 29)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'last90': {
      const from = new Date(now)
      from.setDate(from.getDate() - 89)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: startOfDay(from), to: endOfDay(to) }
    }
    case 'thisYear': {
      const from = new Date(now.getFullYear(), 0, 1)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'custom': {
      if (!custom) throw new Error('CUSTOM_RANGE_REQUIRED')
      return { from: startOfDay(custom.from), to: endOfDay(custom.to) }
    }
    default: {
      const exhaustive: never = preset
      throw new Error(`Unknown period preset: ${exhaustive}`)
    }
  }
}

/** The immediately-preceding period of the same length, for "vs período anterior" (section 9). */
export function previousPeriod(range: PeriodRange): PeriodRange {
  const durationMs = range.to.getTime() - range.from.getTime()
  const to = new Date(range.from.getTime() - 1)
  const from = new Date(to.getTime() - durationMs)
  return { from, to }
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}
