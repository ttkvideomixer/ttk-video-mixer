import { useEffect, useState } from 'react'

/**
 * Updates download silently in the background (see main/updater.ts) and
 * apply automatically next time the app quits — this banner is purely
 * optional, letting someone restart right away instead of waiting.
 */
export default function UpdateReadyBanner(): JSX.Element | null {
  const [version, setVersion] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    return window.api.onUpdateReady(({ version }) => setVersion(version))
  }, [])

  if (!version) return null

  return (
    <div className="flex items-center justify-center gap-3 bg-brand-gradient px-4 py-2 text-xs font-semibold text-white">
      <span>Nova versão ({version}) baixada e pronta.</span>
      <button
        onClick={() => {
          setRestarting(true)
          window.api.restartAndUpdate()
        }}
        disabled={restarting}
        className="rounded-md bg-white/20 px-3 py-1 uppercase tracking-wide hover:bg-white/30 disabled:opacity-50"
      >
        {restarting ? 'Reiniciando...' : 'Reiniciar agora'}
      </button>
    </div>
  )
}
