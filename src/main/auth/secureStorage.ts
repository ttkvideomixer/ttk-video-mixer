import { app, safeStorage } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function filePath(): string {
  return join(app.getPath('userData'), 'session.enc')
}

let warnedAboutPlaintextFallback = false

/**
 * Persists a single small blob (the Supabase auth session) using the OS's
 * own credential encryption (DPAPI on Windows) via Electron's safeStorage —
 * never a raw JSON/token file that any other process on the machine could
 * just read. If safeStorage is ever unavailable, this falls back to a plain
 * file rather than silently losing the session, but says so loudly instead
 * of pretending it's still encrypted (project rule: no silent fallback to
 * plaintext).
 */
export async function readSecureValue(): Promise<string | null> {
  const path = filePath()
  if (!existsSync(path)) return null

  try {
    const buffer = await readFile(path)
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buffer)
    }
    return buffer.toString('utf-8')
  } catch {
    return null
  }
}

export async function writeSecureValue(value: string): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  const path = filePath()

  if (safeStorage.isEncryptionAvailable()) {
    await writeFile(path, safeStorage.encryptString(value))
    return
  }

  if (!warnedAboutPlaintextFallback) {
    warnedAboutPlaintextFallback = true
    // eslint-disable-next-line no-console
    console.warn(
      'safeStorage indisponível neste sistema — a sessão será salva sem a criptografia adicional do SO (ainda protegida apenas pelas permissões do arquivo do usuário).'
    )
  }
  await writeFile(path, value, 'utf-8')
}

export async function clearSecureValue(): Promise<void> {
  await rm(filePath(), { force: true }).catch(() => undefined)
}
