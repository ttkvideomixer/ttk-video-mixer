import { create } from 'zustand'
import type { AuthUser, Device, EntitlementResponse } from '@shared/billing'

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  entitlement: EntitlementResponse | null
  entitlementLoading: boolean
  deviceId: string | null
  trialEligible: boolean
  deviceLimitReached: boolean
  devices: Device[]
  authError: string | null
  authBusy: boolean
  needsEmailConfirmation: boolean

  initialize: () => Promise<void>
  signUp: (name: string, email: string, password: string, tiktokUsername: string | null) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  clearAuthError: () => void
  refreshEntitlement: () => Promise<void>
  refreshDevices: () => Promise<void>
  revokeDevice: (deviceId: string) => Promise<void>
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null
const HEARTBEAT_MS = 12 * 60_000

// Same HMR-survival trick as useAppStore's generation event listeners: a
// module-level variable would be reset to undefined on a dev-mode hot
// reload, leaking the previous IPC listener forever.
declare global {
  interface Window {
    __vmUnsubscribeEntitlementEvents?: () => void
    __vmUnsubscribeAuthHandoffEvents?: () => void
  }
}

async function registerDeviceAndLoadEntitlement(
  set: (partial: Partial<AuthState>) => void
): Promise<void> {
  try {
    const deviceResult = await window.api.registerDevice()
    set({
      deviceId: deviceResult.deviceId,
      trialEligible: deviceResult.trialEligible,
      deviceLimitReached: deviceResult.deviceLimitReached
    })
  } catch (err) {
    console.error('Falha ao registrar dispositivo', err)
  }

  try {
    const entitlement = await window.api.getEntitlement()
    set({ entitlement })
  } catch (err) {
    console.error('Falha ao carregar licença', err)
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  entitlement: null,
  entitlementLoading: false,
  deviceId: null,
  trialEligible: true,
  deviceLimitReached: false,
  devices: [],
  authError: null,
  authBusy: false,
  needsEmailConfirmation: false,

  initialize: async () => {
    window.__vmUnsubscribeEntitlementEvents?.()
    window.__vmUnsubscribeEntitlementEvents = window.api.onEntitlementChanged(() => {
      get().refreshEntitlement()
    })

    window.__vmUnsubscribeAuthHandoffEvents?.()
    window.__vmUnsubscribeAuthHandoffEvents = window.api.onAuthHandoffComplete(({ user, error }) => {
      if (user) {
        set({ status: 'signedIn', user, authBusy: false, authError: null })
        registerDeviceAndLoadEntitlement(set)
      } else if (error) {
        set({ authError: error, authBusy: false })
      }
    })

    try {
      const { user } = await window.api.authGetSession()
      if (user) {
        set({ status: 'signedIn', user })
        await registerDeviceAndLoadEntitlement(set)
        if (!heartbeatInterval) {
          heartbeatInterval = setInterval(() => {
            get().refreshEntitlement()
          }, HEARTBEAT_MS)
        }
      } else {
        set({ status: 'signedOut' })
      }
    } catch {
      set({ status: 'signedOut' })
    }
  },

  signUp: async (name, email, password, tiktokUsername) => {
    set({ authBusy: true, authError: null })
    try {
      const result = await window.api.authSignUp({ name, email, password, tiktokUsername })
      if (result.needsEmailConfirmation) {
        set({ authBusy: false, needsEmailConfirmation: true })
        return
      }
      set({ status: 'signedIn', user: result.user, authBusy: false })
      await registerDeviceAndLoadEntitlement(set)
    } catch (err) {
      set({ authBusy: false, authError: err instanceof Error ? err.message : 'Não foi possível criar sua conta.' })
    }
  },

  signIn: async (email, password) => {
    set({ authBusy: true, authError: null })
    try {
      const user = await window.api.authSignIn(email, password)
      set({ status: 'signedIn', user, authBusy: false })
      await registerDeviceAndLoadEntitlement(set)
    } catch (err) {
      set({ authBusy: false, authError: err instanceof Error ? err.message : 'E-mail ou senha inválidos.' })
    }
  },

  signInWithGoogle: async () => {
    set({ authBusy: true, authError: null })
    try {
      const user = await window.api.authSignInWithGoogle()
      set({ status: 'signedIn', user, authBusy: false })
      await registerDeviceAndLoadEntitlement(set)
    } catch (err) {
      set({ authBusy: false, authError: err instanceof Error ? err.message : 'Não foi possível entrar com o Google.' })
    }
  },

  signOut: async () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    await window.api.authSignOut()
    set({
      status: 'signedOut',
      user: null,
      entitlement: null,
      devices: [],
      authError: null,
      needsEmailConfirmation: false
    })
  },

  sendPasswordReset: async (email) => {
    set({ authBusy: true, authError: null })
    try {
      await window.api.authSendPasswordReset(email)
      set({ authBusy: false })
    } catch (err) {
      set({ authBusy: false, authError: err instanceof Error ? err.message : 'Não foi possível enviar o e-mail de recuperação.' })
    }
  },

  clearAuthError: () => set({ authError: null }),

  refreshEntitlement: async () => {
    set({ entitlementLoading: true })
    try {
      const entitlement = await window.api.getEntitlement()
      set({ entitlement, entitlementLoading: false })
    } catch (err) {
      console.error('Falha ao atualizar licença', err)
      set({ entitlementLoading: false })
    }
  },

  refreshDevices: async () => {
    try {
      const devices = await window.api.listDevices()
      set({ devices })
    } catch (err) {
      console.error('Falha ao carregar dispositivos', err)
    }
  },

  revokeDevice: async (deviceId) => {
    await window.api.revokeDevice(deviceId)
    await get().refreshDevices()
  }
}))
