'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'
import { getUtmParams } from '@/lib/utm'

type ClickState = 'idle' | 'preparing' | 'started'

interface Props {
  platform: 'windows' | 'macos'
  title: string
  subtitle: string
  available: boolean
  version?: string
  sizeLabel?: string
  recommended?: boolean
}

export default function DownloadCard({ platform, title, subtitle, available, version, sizeLabel, recommended }: Props): JSX.Element {
  const [state, setState] = useState<ClickState>('idle')

  const handleClick = (): void => {
    track('download_clicked', { platform, ...getUtmParams() })
    setState('preparing')
    window.location.href = `/api/download/${platform}`
    setTimeout(() => setState('started'), 900)
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        recommended ? 'border-brand/50 bg-brand/5 shadow-glow' : 'border-bg-border bg-bg-card'
      }`}
    >
      {recommended && (
        <span className="mb-3 w-fit rounded-full bg-brand-gradient px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
          Recomendado para você
        </span>
      )}
      <h3 className="text-lg font-extrabold text-white">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>

      {available ? (
        <>
          <button
            onClick={handleClick}
            className="mt-5 rounded-xl bg-brand-gradient px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-black shadow-glow hover:opacity-90"
          >
            {state === 'idle' && `Baixar para ${title}`}
            {state === 'preparing' && 'Preparando download...'}
            {state === 'started' && 'Download iniciado ✓'}
          </button>
          <p className="mt-2 text-[11px] text-gray-500">
            {version ? `Versão ${version}` : 'Build local de desenvolvimento'}
            {sizeLabel ? ` · ${sizeLabel}` : ''}
          </p>
        </>
      ) : (
        <div className="mt-5">
          <button disabled className="w-full cursor-not-allowed rounded-xl border border-bg-border px-5 py-3 text-sm font-bold text-gray-500">
            Em breve
          </button>
          <p className="mt-2 text-[11px] text-gray-600">
            Ainda não publicamos uma build estável para {title}. Assim que existir, este botão passa a funcionar automaticamente.
          </p>
        </div>
      )}
    </div>
  )
}
