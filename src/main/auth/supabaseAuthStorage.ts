import { clearSecureValue, readSecureValue, writeSecureValue } from './secureStorage'

/**
 * Supabase JS expects a synchronous-or-async key/value storage with
 * getItem/setItem/removeItem. The desktop app only ever has one signed-in
 * session at a time, so every key maps to the same encrypted file —
 * simpler than reimplementing a full key-value store for a single value.
 */
export const electronAuthStorage = {
  getItem: async (_key: string): Promise<string | null> => readSecureValue(),
  setItem: async (_key: string, value: string): Promise<void> => writeSecureValue(value),
  removeItem: async (_key: string): Promise<void> => clearSecureValue()
}
