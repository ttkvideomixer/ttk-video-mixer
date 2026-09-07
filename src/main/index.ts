import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerIpcHandlers } from './ipc/handlers'
import { registerAuthHandlers } from './ipc/authHandlers'
import { registerBillingHandlers } from './ipc/billingHandlers'
import { registerMediaProtocolAsPrivileged, registerMediaProtocolHandler } from './mediaProtocol'
import { registerDeepLinkProtocol, handleDeepLinkArgv, handleOpenUrl } from './deepLink'

registerMediaProtocolAsPrivileged()
registerDeepLinkProtocol()

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  // Google OAuth / billing-success deep links: when the user finishes in
  // their browser, Windows launches `video-mixer.exe videomixer://...`,
  // which single-instance-lock redirects here as a second-instance event
  // instead of opening a second window.
  app.on('second-instance', (_event, argv) => {
    const [existingWindow] = BrowserWindow.getAllWindows()
    if (existingWindow) {
      if (existingWindow.isMinimized()) existingWindow.restore()
      existingWindow.focus()
    }
    handleDeepLinkArgv(argv)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleOpenUrl(url)
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.ttkvideomixer.app')
    registerMediaProtocolHandler()

    app.on('browser-window-created', (_event, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    const mainWindow = createMainWindow()
    registerIpcHandlers(mainWindow)
    registerAuthHandlers(mainWindow)
    registerBillingHandlers()

    // Launched directly via the protocol (e.g. app wasn't already running
    // when the browser redirect fired).
    handleDeepLinkArgv(process.argv)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const newWindow = createMainWindow()
        registerIpcHandlers(newWindow)
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

if (is.dev) {
  // Surfaces main-process errors during development instead of failing silently.
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled rejection in main process:', reason)
  })
}
