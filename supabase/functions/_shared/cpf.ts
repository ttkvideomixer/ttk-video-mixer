/**
 * Same checksum rule as src/shared/cpf.ts on the desktop app — duplicated
 * here because Edge Functions (Deno) can't import across the app's Vite/
 * Node source tree. Never trust a client-sent CPF without this check:
 * Pagar.me will reject an invalid one anyway, but validating first gives a
 * clear INVALID_REQUEST instead of a confusing 500 from the Pagar.me call.
 */
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
