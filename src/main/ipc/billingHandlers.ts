import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import { fetchEntitlement } from '../billing/entitlementService'
import {
  cancelSubscription,
  createCardCheckout,
  createPixCheckout,
  deleteAccount,
  reactivateSubscription,
  reconcileSubscription
} from '../billing/billingService'
import { listDevices, registerCurrentDevice, revokeDevice } from '../billing/deviceService'

export function registerBillingHandlers(): void {
  ipcMain.handle(IpcChannels.getEntitlement, async () => fetchEntitlement())
  ipcMain.handle(IpcChannels.createCardCheckout, async () => createCardCheckout())
  ipcMain.handle(IpcChannels.createPixCheckout, async () => createPixCheckout())
  ipcMain.handle(IpcChannels.cancelSubscription, async () => cancelSubscription())
  ipcMain.handle(IpcChannels.reactivateSubscription, async () => reactivateSubscription())
  ipcMain.handle(IpcChannels.reconcileSubscription, async () => reconcileSubscription())
  ipcMain.handle(IpcChannels.deleteAccount, async () => deleteAccount())

  ipcMain.handle(IpcChannels.registerDevice, async () => registerCurrentDevice())
  ipcMain.handle(IpcChannels.listDevices, async () => listDevices())
  ipcMain.handle(IpcChannels.revokeDevice, async (_event, deviceId: string) => revokeDevice(deviceId))
}
