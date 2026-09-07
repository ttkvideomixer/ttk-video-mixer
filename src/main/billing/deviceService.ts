import { app } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { hostname, cpus, platform, arch } from 'node:os'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getSupabaseClient } from '../auth/supabaseClient'
import { normalizeFunctionsError } from './httpFunctionError'
import type { Device } from '@shared/billing'

interface InstallationRecord {
  installationId: string
}

function installationFilePath(): string {
  return join(app.getPath('userData'), 'installation.json')
}

/**
 * A stable per-installation UUID, generated once and kept for the life of
 * this install (reinstalling the app creates a new one — see project rule
 * "reinstalar não restaura o trial", enforced server-side by trial_devices
 * keying off the device *fingerprint*, not this id, which only identifies
 * "this specific install" for the 2-device Pro limit).
 */
async function getOrCreateInstallationId(): Promise<string> {
  const path = installationFilePath()
  if (existsSync(path)) {
    try {
      const record = JSON.parse(await readFile(path, 'utf-8')) as InstallationRecord
      if (record.installationId) return record.installationId
    } catch {
      // fall through to regenerate
    }
  }

  const installationId = randomUUID()
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(path, JSON.stringify({ installationId } satisfies InstallationRecord), 'utf-8')
  return installationId
}

/**
 * Only a hash of a few stable, non-invasive machine characteristics is ever
 * sent to the server (never raw hardware serials) — used purely for trial
 * anti-abuse and Pro device-limit enforcement (see project privacy note in
 * README and section "Privacidade do device fingerprint").
 */
function computeDeviceFingerprint(): string {
  const raw = [hostname(), platform(), arch(), cpus()[0]?.model ?? ''].join('|')
  return createHash('sha256').update(raw).digest('hex')
}

export interface RegisterDeviceResult {
  deviceId: string | null
  trialEligible: boolean
  deviceLimitReached: boolean
  installationId: string
}

export async function registerCurrentDevice(): Promise<RegisterDeviceResult> {
  const installationId = await getOrCreateInstallationId()
  const deviceHash = computeDeviceFingerprint()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.functions.invoke('manage-device', {
    body: {
      action: 'register',
      deviceHash,
      installationId,
      deviceName: `${hostname()} (${platform()})`
    }
  })

  if (error) throw await normalizeFunctionsError(error)

  const result = data as { ok: boolean; code?: string; deviceId?: string; trialEligible?: boolean }
  return {
    deviceId: result.deviceId ?? null,
    trialEligible: result.trialEligible ?? true,
    deviceLimitReached: result.code === 'DEVICE_LIMIT',
    installationId
  }
}

export async function listDevices(): Promise<Device[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('manage-device', { body: { action: 'list' } })
  if (error) throw await normalizeFunctionsError(error)
  return (data as { devices: Device[] }).devices
}

export async function revokeDevice(deviceId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.functions.invoke('manage-device', { body: { action: 'revoke', deviceId } })
  if (error) throw await normalizeFunctionsError(error)
}
