import { useEffect, useState } from 'react'

/**
 * Updates download silently in the background (see main/updater.ts) and
 * apply automatically the next time the app quits — this dialog is purely
 * optional, letting someone update right away instead of waiting until
 * they close the app. Dismissing it changes nothing: the silent
 * install-on-quit still happens regardless.
 *
 * The install itself never shows any installer window (it runs NSIS with
 * /S), so without this the app would just vanish for a few seconds with
 * zero feedback — indistinguishable from a crash. `onUpdateInstalling`
 * fires right before that happens (from the "Atualizar agora" button AND
 * from a normal app close, since both paths funnel through the same
 * silent install in main/updater.ts), so this takes over the whole screen
 * either way.
 */
export default function UpdateReadyBanner(): JSX.Element | null {
  const [version, setVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    return window.api.onUpdateReady(({ version }) => setVersion(version))
  }, [])

  useEffect(() => {
    return window.api.onUpdateInstalling(() => setInstalling(true))
  }, [])

  if (installing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-white p-6 text-center shadow-2xl">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
          <div>
            <p className="text-base font-semibold text-gray-900">Atualizando o TTK Video Mixer...</p>
            <p className="mt-2 text-sm text-gray-500">
              O programa vai fechar e abrir sozinho em instantes. Não feche pela barra de tarefas.
            </p>
          </div>
        </div>
      </div>
    )
  }

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
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Fechar
          </button>
          <button
            onClick={() => window.api.restartAndUpdate()}
            className="rounded-md bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Atualizar agora
          </button>
        </div>
      </div>
    </div>
  )
}
