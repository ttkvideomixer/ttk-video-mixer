import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import type { AuthUser } from '@shared/billing'
import { parseAuthHandoffUrl } from '@shared/deepLink'
import { setAuthHandoffHandler } from '../deepLink'
import {
  getAccessToken,
  getCurrentUser,
  redeemDesktopHandoff,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  updatePassword
} from '../auth/authService'
import { subscribeToEntitlementChanges, unsubscribeFromEntitlementChanges } from '../auth/realtime'

export function registerAuthHandlers(mainWindow: BrowserWindow): void {
  function trackSession(user: AuthUser | null): void {
    if (user) {
      subscribeToEntitlementChanges(user.id, () => {
        mainWindow.webContents.send(IpcChannels.onEntitlementChanged)
      })
    } else {
      unsubscribeFromEntitlementChanges()
    }
  }

  ipcMain.handle(
    IpcChannels.authSignUp,
    async (_event, input: { name: string; email: string; password: string; tiktokUsername: string | null }) => {
      const result = await signUpWithEmail(input.name, input.email, input.password, input.tiktokUsername)
      trackSession(result.user)
      return result
    }
  )

  ipcMain.handle(IpcChannels.authSignIn, async (_event, input: { email: string; password: string }) => {
    const user = await signInWithEmail(input.email, input.password)
    trackSession(user)
    return user
  })

  ipcMain.handle(IpcChannels.authSignInWithGoogle, async () => {
    const user = await signInWithGoogle()
    trackSession(user)
    return user
  })

  ipcMain.handle(IpcChannels.authSignOut, async () => {
    await signOut()
    trackSession(null)
  })

  ipcMain.handle(IpcChannels.authGetSession, async () => {
    const user = await getCurrentUser()
    const hasToken = (await getAccessToken()) !== null
    trackSession(user)
    return { user, hasToken }
  })

  ipcMain.handle(IpcChannels.authSendPasswordReset, async (_event, email: string) => {
    await sendPasswordReset(email)
  })

  ipcMain.handle(IpcChannels.authUpdatePassword, async (_event, newPassword: string) => {
    await updatePassword(newPassword)
  })

  // Unlike every other auth action above, this one isn't triggered by the
  // renderer clicking something — it's the OS handing us a
  // `videomixer://auth/handoff` link (from the website's "already have the
  // app? sign in automatically" button), so the result is pushed to the
  // renderer instead of returned from an invoke() call.
  setAuthHandoffHandler((url) => {
    const parsed = parseAuthHandoffUrl(url)
    if (!parsed) {
      mainWindow.webContents.send(IpcChannels.onAuthHandoffComplete, { user: null, error: 'Link de login inválido.' })
      return
    }

    redeemDesktopHandoff(parsed.token)
      .then((user) => {
        trackSession(user)
        mainWindow.webContents.send(IpcChannels.onAuthHandoffComplete, { user })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Não foi possível concluir o login automático.'
        mainWindow.webContents.send(IpcChannels.onAuthHandoffComplete, { user: null, error: message })
      })
  })
}
