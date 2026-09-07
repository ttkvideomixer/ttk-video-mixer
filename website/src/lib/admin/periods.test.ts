import { describe, expect, it } from 'vitest'
import { percentChange, previousPeriod, resolvePeriod } from './periods'

const NOW = new Date('2026-06-15T14:30:00')

describe('resolvePeriod', () => {
  it('today spans the whole current day', () => {
    const { from, to } = resolvePeriod('today', NOW)
    expect(from.getDate()).toBe(15)
    expect(from.getHours()).toBe(0)
    expect(to.getHours()).toBe(23)
  })

  it('yesterday is the previous calendar day', () => {
    const { from, to } = resolvePeriod('yesterday', NOW)
    expect(from.getDate()).toBe(14)
    expect(to.getDate()).toBe(14)
  })

  it('last7 spans 7 calendar days including today', () => {
    const { from, to } = resolvePeriod('last7', NOW)
    const days = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
    expect(days).toBe(7)
    expect(from.getDate()).toBe(9)
  })

  it('thisMonth starts on the 1st', () => {
    const { from } = resolvePeriod('thisMonth', NOW)
    expect(from.getDate()).toBe(1)
    expect(from.getMonth()).toBe(5)
  })

  it('lastMonth is the entire previous calendar month', () => {
    const { from, to } = resolvePeriod('lastMonth', NOW)
    expect(from.getMonth()).toBe(4)
    expect(from.getDate()).toBe(1)
    expect(to.getMonth()).toBe(4)
    expect(to.getDate()).toBe(31)
  })

  it('thisYear starts January 1st', () => {
    const { from } = resolvePeriod('thisYear', NOW)
    expect(from.getMonth()).toBe(0)
    expect(from.getDate()).toBe(1)
  })

  it('custom uses the provided range', () => {
    const { from, to } = resolvePeriod('custom', NOW, {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31)
    })
    expect(from.getMonth()).toBe(0)
    expect(to.getDate()).toBe(31)
  })

  it('custom without a range throws instead of guessing', () => {
    expect(() => resolvePeriod('custom', NOW)).toThrow('CUSTOM_RANGE_REQUIRED')
  })
})

describe('previousPeriod', () => {
  it('returns an immediately-preceding window of the same length', () => {
    const range = { from: new Date('2026-06-08T00:00:00'), to: new Date('2026-06-14T23:59:59') }
    const prev = previousPeriod(range)
    expect(prev.to.getTime()).toBeLessThan(range.from.getTime())
    const currentDuration = range.to.getTime() - range.from.getTime()
    const prevDuration = prev.to.getTime() - prev.from.getTime()
    expect(Math.round(prevDuration / 1000)).toBe(Math.round(currentDuration / 1000))
  })
})

describe('percentChange', () => {
  it('computes a positive change', () => {
    expect(percentChange(118.4, 100)).toBeCloseTo(18.4, 1)
  })

  it('computes a negative change', () => {
    expect(percentChange(80, 100)).toBeCloseTo(-20, 1)
  })

  it('returns null instead of inventing a percentage from a zero base (unless both are zero)', () => {
    expect(percentChange(50, 0)).toBeNull()
    expect(percentChange(0, 0)).toBe(0)
  })
})
