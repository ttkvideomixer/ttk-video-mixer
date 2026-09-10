import { useEffect, useState } from 'react'

/**
 * Updates download silently in the background (see main/updater.ts) and
 * apply automatically the next time the app quits — this dialog is purely
 * optional, letting someone update right away instead of waiting until
 * they close the app. Dismissing it changes nothing: the silent
 * install-on-quit still happens regardless.
 */
export default function UpdateReadyBanner(): JSX.Element | null {
  const [version, setVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    return window.api.onUpdateReady(({ version }) => setVersion(version))
  }, [])

  if (!version || dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
        <p className="text-base font-semibold text-gray-900">Atualização disponível</p>
        <p className="mt-2 text-sm text-gray-500">
          Uma nova versão ({version}) já foi baixada e está pronta para instalar.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={() => setDismissed(true)}
            disabled={updating}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              setUpdating(true)
              window.api.restartAndUpdate()
            }}
            disabled={updating}
            className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {updating ? 'Atualizando...' : 'Atualizar agora'}
          </button>
        </div>
      </div>
    </div>
  )
}
