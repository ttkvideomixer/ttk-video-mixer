/** Strips everything but digits — accepts "123.456.789-00" or "12345678900" alike. */
export function sanitizeCpf(input: string): string {
  return input.replace(/\D/g, '')
}

function calcCheckDigit(base: number[]): number {
  let sum = 0
  let weight = base.length + 1
  for (const digit of base) {
    sum += digit * weight
    weight--
  }
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

/**
 * Standard Brazilian CPF checksum validation (11 digits, two verifier
 * digits computed from the first 9). Pagar.me requires a real, valid CPF to
 * create a customer — validating client-side here gives a fast, clear error
 * instead of a round trip that fails on their end.
 */
export function isValidCpf(input: string): boolean {
  const cpf = sanitizeCpf(input)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)
  const firstCheck = calcCheckDigit(digits.slice(0, 9))
  if (firstCheck !== digits[9]) return false
  const secondCheck = calcCheckDigit(digits.slice(0, 10))
  if (secondCheck !== digits[10]) return false

  return true
}

/** "12345678900" -> "123.456.789-00", for display in the checkout form. */
export function formatCpf(input: string): string {
  const cpf = sanitizeCpf(input).slice(0, 11)
  const parts = [cpf.slice(0, 3), cpf.slice(3, 6), cpf.slice(6, 9)].filter(Boolean)
  let formatted = parts.join('.')
  if (cpf.length > 9) formatted += `-${cpf.slice(9, 11)}`
  return formatted
}
