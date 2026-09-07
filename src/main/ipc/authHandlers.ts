import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import type { AuthUser } from '@shared/billing'
import {
  getAccessToken,
  getCurrentUser,
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
}
