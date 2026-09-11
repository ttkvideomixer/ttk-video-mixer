import { autoUpdater } from 'electron-updater'
import { app, ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'

const CHECK_INTERVAL_MS = 4 * 60 * 60_000
const FIRST_CHECK_DELAY_MS = 15_000
/** Gives the renderer time to paint the "Atualizando..." screen before the window actually closes for the silent install. */
const INSTALL_NOTICE_DELAY_MS = 1_800

/**
 * Downloads updates silently in the background and applies them on the
 * next app quit — never interrupts a running video generation job with a
 * forced restart. The renderer only hears about it once a downloaded
 * update is ready (see onUpdateReady), so it can offer "restart now" as an
 * optional action instead of surprising the user mid-task.
 *
 * Every install (whether from the "Reiniciar agora" button or from a
 * normal quit) goes through the SAME explicit `quitAndInstall(true, true)`
 * call — isSilent so the NSIS installer never flashes its wizard UI (which
 * looks exactly like a fresh install to someone who didn't ask for one),
 * isForceRunAfter so the app comes back up on its own afterwards. We don't
 * rely on `autoInstallOnAppQuit`'s own default quitAndInstall() call here
 * because it is NOT silent — that's what caused the update to visibly
 * "reinstall" instead of applying invisibly.
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  let updateReady = false
  let installing = false

  const install = (): void => {
    if (installing) return
    installing = true
    // The window is about to close (silently, no installer UI at all) and
    // won't reopen until the update finishes applying — without this,
    // closing the app for an update looks identical to it crashing.
    mainWindow.webContents.send(IpcChannels.onUpdateInstalling)
    setTimeout(() => autoUpdater.quitAndInstall(true, true), INSTALL_NOTICE_DELAY_MS)
  }

  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true
    mainWindow.webContents.send(IpcChannels.onUpdateReady, { version: info.version })
  })

  ipcMain.handle(IpcChannels.restartAndUpdate, () => install())

  app.on('before-quit', (event) => {
    if (updateReady || installing) {
      event.preventDefault()
      install()
    }
  })

  autoUpdater.on('error', (err) => {
    // Never surface this to the user — a failed background check must not
    // look like the app itself is broken. Logged for our own diagnosis only.
    console.error('autoUpdater error', err)
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch((err) => console.error('checkForUpdates failed', err))
  }

  setTimeout(check, FIRST_CHECK_DELAY_MS)
  setInterval(check, CHECK_INTERVAL_MS)
}
