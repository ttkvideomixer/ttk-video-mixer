import { describe, expect, it } from 'vitest'
import { sanitizeFileNamePart } from './sanitize'

describe('sanitizeFileNamePart', () => {
  it('replaces illegal Windows characters', () => {
    expect(sanitizeFileNamePart('Meu produto / Setembro:*?')).toBe('Meu_produto_Setembro')
  })

  it('falls back when the result is empty', () => {
    expect(sanitizeFileNamePart('///???')).toBe('video')
  })

  it('escapes reserved device names', () => {
    expect(sanitizeFileNamePart('CON')).toBe('CON_arquivo')
  })

  it('keeps a normal name untouched', () => {
    expect(sanitizeFileNamePart('short_linho')).toBe('short_linho')
  })
})
