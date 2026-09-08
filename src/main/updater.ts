import { autoUpdater } from 'electron-updater'
import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'

const CHECK_INTERVAL_MS = 4 * 60 * 60_000
const FIRST_CHECK_DELAY_MS = 15_000

/**
 * Downloads updates silently in the background and applies them on the
 * next app quit — never interrupts a running video generation job with a
 * forced restart. The renderer only hears about it once a downloaded
 * update is ready (see onUpdateReady), so it can offer "restart now" as an
 * optional action instead of surprising the user mid-task.
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send(IpcChannels.onUpdateReady, { version: info.version })
  })

  ipcMain.handle(IpcChannels.restartAndUpdate, () => {
    autoUpdater.quitAndInstall()
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
