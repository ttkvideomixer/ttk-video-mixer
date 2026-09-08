import { describe, expect, it } from 'vitest'
import { formatCpf, isValidCpf, sanitizeCpf } from './cpf'

describe('sanitizeCpf', () => {
  it('strips non-digit characters', () => {
    expect(sanitizeCpf('123.456.789-09')).toBe('12345678909')
  })
})

describe('isValidCpf', () => {
  it('accepts a valid CPF', () => {
    expect(isValidCpf('123.456.789-09')).toBe(true)
  })

  it('rejects wrong length', () => {
    expect(isValidCpf('12345')).toBe(false)
  })

  it('rejects all-same-digit CPFs', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })

  it('rejects a CPF with a wrong check digit', () => {
    expect(isValidCpf('123.456.789-00')).toBe(false)
  })
})

describe('formatCpf', () => {
  it('formats a raw digit string', () => {
    expect(formatCpf('12345678909')).toBe('123.456.789-09')
  })

  it('formats partial input progressively', () => {
    expect(formatCpf('123456')).toBe('123.456')
  })
})
