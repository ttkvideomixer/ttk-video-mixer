import { describe, expect, it } from 'vitest'
import { buildCombinationLabel, buildOutputFileName, padIndex } from './naming'

describe('padIndex', () => {
  it('pads to at least 2 digits', () => {
    expect(padIndex(1, 10)).toBe('01')
    expect(padIndex(10, 10)).toBe('10')
  })

  it('grows width when the total count needs more digits', () => {
    expect(padIndex(4, 8000)).toBe('0004')
  })
})

describe('buildOutputFileName', () => {
  it('builds the documented naming pattern', () => {
    const name = buildOutputFileName({
      prefix: 'video',
      hookIndex: 0,
      bodyIndex: 0,
      ctaIndex: 0,
      hookCount: 10,
      bodyCount: 10,
      ctaCount: 10
    })
    expect(name).toBe('video_G01_C01_CTA01.mp4')
  })

  it('applies a custom prefix', () => {
    const name = buildOutputFileName({
      prefix: 'short_linho',
      hookIndex: 0,
      bodyIndex: 2,
      ctaIndex: 6,
      hookCount: 10,
      bodyCount: 10,
      ctaCount: 10
    })
    expect(name).toBe('short_linho_G01_C03_CTA07.mp4')
  })

  it('sanitizes an invalid prefix', () => {
    const name = buildOutputFileName({
      prefix: 'Meu produto / Setembro:*?',
      hookIndex: 0,
      bodyIndex: 0,
      ctaIndex: 0,
      hookCount: 1,
      bodyCount: 1,
      ctaCount: 1
    })
    expect(name).toMatch(/^Meu_produto_Setembro_G01_C01_CTA01\.mp4$/)
  })

  it('never produces two identical file names for different combinations', () => {
    const names = new Set<string>()
    for (let h = 0; h < 10; h++) {
      for (let b = 0; b < 10; b++) {
        for (let c = 0; c < 10; c++) {
          names.add(
            buildOutputFileName({
              prefix: 'video',
              hookIndex: h,
              bodyIndex: b,
              ctaIndex: c,
              hookCount: 10,
              bodyCount: 10,
              ctaCount: 10
            })
          )
        }
      }
    }
    expect(names.size).toBe(1000)
  })
})

describe('buildCombinationLabel', () => {
  it('builds a human readable label', () => {
    const label = buildCombinationLabel({
      hookIndex: 3,
      bodyIndex: 4,
      ctaIndex: 6,
      hookCount: 10,
      bodyCount: 10,
      ctaCount: 10
    })
    expect(label).toBe('G04+C05+CTA07')
  })
})
