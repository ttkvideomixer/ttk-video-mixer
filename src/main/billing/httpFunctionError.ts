import type { BillingErrorCode } from '@shared/billing'
import { billingErrorMessage } from '@shared/billing'

export class HttpFunctionError extends Error {
  code: BillingErrorCode | 'NETWORK_REQUIRED'

  constructor(code: BillingErrorCode | 'NETWORK_REQUIRED', message: string) {
    super(message)
    this.code = code
  }
}

interface SupabaseFunctionsInvokeError {
  name?: string
  message?: string
  context?: Response
}

/**
 * Supabase JS reports a failed Edge Function call as a generic error whose
 * `.context` is the raw Response — our Edge Functions always answer with a
 * `{ error: { code, message } }` body, so unwrap that to get a stable code
 * the renderer can map to Portuguese copy (see shared/billing.ts).
 */
export async function normalizeFunctionsError(error: SupabaseFunctionsInvokeError): Promise<HttpFunctionError> {
  if (error?.name === 'FunctionsFetchError' || !error?.context) {
    return new HttpFunctionError('NETWORK_REQUIRED', 'Conecte-se à internet para validar sua licença e iniciar a geração.')
  }

  try {
    const body = (await error.context.json()) as { error?: { code?: string; message?: string } }
    const code = (body.error?.code as BillingErrorCode) ?? 'SERVER_ERROR'
    return new HttpFunctionError(code, body.error?.message ?? billingErrorMessage(code))
  } catch {
    return new HttpFunctionError('SERVER_ERROR', billingErrorMessage('SERVER_ERROR'))
  }
}
