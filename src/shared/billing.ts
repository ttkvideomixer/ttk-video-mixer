export type PlanType = 'free' | 'pro'

export type EntitlementStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'suspended'

export type PaymentMethodType = 'credit_card_subscription' | 'pix_30_days' | 'apple_pay'

export interface EntitlementResponse {
  userId: string
  plan: PlanType
  status: EntitlementStatus
  trialTotal: number
  trialUsed: number
  trialRemaining: number
  trialEligible: boolean
  generationAllowed: boolean
  generationLimit: number | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  paymentMethod: string | null
  lastPaymentStatus: string | null
  serverTime: string
  blocked: boolean
  blockedReason: string | null
  accessGrantActive: boolean
  accessGrantType: string | null
  accessGrantEnd: string | null
}

export interface GenerationAuthorization {
  allowed: boolean
  reason?: BillingErrorCode
  mode?: 'unlimited' | 'trial'
  allowedOutputs?: number
  reservationId?: string
  expiresAt?: string
}

export interface Device {
  id: string
  device_name: string | null
  first_seen_at: string
  last_seen_at: string
  revoked_at: string | null
}

export interface AuthUser {
  id: string
  email: string | null
}

export type BillingErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_BLOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'TRIAL_EXHAUSTED'
  | 'TRIAL_NOT_ELIGIBLE'
  | 'SUBSCRIPTION_REQUIRED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'SUBSCRIPTION_EXPIRED'
  | 'DEVICE_LIMIT'
  | 'PAYMENT_PENDING'
  | 'NETWORK_REQUIRED'
  | 'LICENSE_INVALID'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'

/** Portuguese, user-facing copy for each server error code — never show raw gateway/API text. */
export const BILLING_ERROR_MESSAGES: Record<BillingErrorCode, string> = {
  AUTH_REQUIRED: 'Você precisa entrar na sua conta para continuar.',
  ACCOUNT_BLOCKED: 'Sua conta está temporariamente bloqueada. Entre em contato com o suporte.',
  EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de usar o teste gratuito.',
  TRIAL_EXHAUSTED: 'Você já utilizou seus 27 vídeos gratuitos.',
  TRIAL_NOT_ELIGIBLE: 'Este dispositivo já utilizou o teste gratuito.',
  SUBSCRIPTION_REQUIRED: 'Assine o TTK Video Mixer Pro para continuar gerando.',
  SUBSCRIPTION_PAST_DUE: 'Não conseguimos renovar sua assinatura. Atualize o pagamento para continuar gerando.',
  SUBSCRIPTION_EXPIRED: 'Sua assinatura expirou. Assine novamente para continuar.',
  DEVICE_LIMIT: 'Você atingiu o limite de dispositivos do seu plano.',
  PAYMENT_PENDING: 'Pagamento pendente de confirmação.',
  NETWORK_REQUIRED: 'Conecte-se à internet para validar sua licença e iniciar a geração.',
  LICENSE_INVALID: 'Não foi possível validar sua licença.',
  INVALID_REQUEST: 'Solicitação inválida.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um momento antes de tentar novamente.',
  SERVER_ERROR: 'Não conseguimos validar sua conta neste momento. Verifique sua conexão e tente novamente.'
}

export function billingErrorMessage(code: string | undefined | null): string {
  if (code && code in BILLING_ERROR_MESSAGES) return BILLING_ERROR_MESSAGES[code as BillingErrorCode]
  return BILLING_ERROR_MESSAGES.SERVER_ERROR
}

/**
 * IPC errors thrown from the main process arrive in the renderer as a
 * generic Error whose `.message` contains (possibly wrapped by Electron's
 * own "Error invoking remote method" prefix) the original code string —
 * this finds which known billing code it is, if any.
 */
export function extractBillingErrorCode(message: string | undefined | null): BillingErrorCode | null {
  if (!message) return null
  const match = (Object.keys(BILLING_ERROR_MESSAGES) as BillingErrorCode[]).find((code) => message.includes(code))
  return match ?? null
}

/** The free-trial proposal shown throughout the UI: 3 Hooks x 3 Bodies x 3 CTAs. */
export const TRIAL_DIMENSION = 3
export const TRIAL_TOTAL_OUTPUTS = TRIAL_DIMENSION ** 3

export const PRO_MONTHLY_PRICE_LABEL = 'R$ 14,99'
export const PIX_30_DAYS_PRICE_LABEL = 'R$ 14,99'
