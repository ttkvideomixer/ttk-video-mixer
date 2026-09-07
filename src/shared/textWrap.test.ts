import { describe, expect, it } from 'vitest'
import { estimateLineWidthPx, fitTextToWidth, wrapTextByWords } from './textWrap'

describe('wrapTextByWords', () => {
  it('never splits a word in the middle', () => {
    const lines = wrapTextByWords('Você também sofre com isso todos os dias', 10)
    const words = 'Você também sofre com isso todos os dias'.split(' ')
    const rejoined = lines.join(' ').split(/\s+/)
    expect(rejoined).toEqual(words)
  })

  it('caps at 3 lines by default', () => {
    const lines = wrapTextByWords('uma duas tres quatro cinco seis sete oito nove dez onze doze', 6)
    expect(lines.length).toBeLessThanOrEqual(3)
  })

  it('keeps a short text on one line', () => {
    expect(wrapTextByWords('Olha isso', 30)).toEqual(['Olha isso'])
  })
})

describe('fitTextToWidth', () => {
  it('shrinks a long text until it fits within maxLines', () => {
    const result = fitTextToWidth(
      'Você também sofre com isso todos os dias e não sabe como resolver esse problema',
      80,
      400
    )
    expect(result.lines.length).toBeLessThanOrEqual(3)
    expect(result.fontSizeRatio).toBeLessThanOrEqual(1)
    expect(result.fontSizeRatio).toBeGreaterThan(0)
  })

  it('keeps a short text at full size', () => {
    const result = fitTextToWidth('Olha isso', 80, 800)
    expect(result.fontSizeRatio).toBe(1)
    expect(result.lines).toEqual(['Olha isso'])
  })
})

describe('estimateLineWidthPx', () => {
  it('grows with both text length and font size', () => {
    expect(estimateLineWidthPx('abcd', 100)).toBeGreaterThan(estimateLineWidthPx('ab', 100))
    expect(estimateLineWidthPx('abcd', 100)).toBeGreaterThan(estimateLineWidthPx('abcd', 50))
  })
})
