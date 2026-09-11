import { FolderOpen, User } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'
import { useAuthStore } from '../state/useAuthStore'
import Badge from './Badge'

function Header(): JSX.Element {
  const openAccount = useAppStore((s) => s.openAccount)
  const lastGeneratedFolder = useAppStore((s) => s.lastGeneratedFolder)
  const user = useAuthStore((s) => s.user)
  const entitlement = useAuthStore((s) => s.entitlement)

  const isBlocked = entitlement?.blocked === true
  const isBonus = !isBlocked && entitlement?.accessGrantActive === true
  const isPro = !isBlocked && (entitlement?.plan === 'pro' || isBonus)
  const trialLabel =
    entitlement && entitlement.plan === 'free' && !isBonus ? `${entitlement.trialRemaining} grátis restantes` : null
  const bonusLabel =
    isBonus && entitlement?.accessGrantEnd
      ? `Bônus até ${new Date(entitlement.accessGrantEnd).toLocaleDateString('pt-BR')}`
      : null

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-bg-border bg-bg-card px-8 py-5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tiktok-gradient">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="black" />
          </svg>
        </span>
        {lastGeneratedFolder && (
          <button
            onClick={() => window.api.openPath(lastGeneratedFolder)}
            title={lastGeneratedFolder}
            className="flex items-center gap-2 rounded-full border border-bg-border bg-bg-soft px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-border"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Ver Vídeos Gerados
          </button>
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          TTK VIDEO <span className="gradient-text">MIXER</span>
        </h1>
        <p className="text-sm text-gray-400">
          Crie centenas de variações combinando Ganchos, Corpos e CTAs.
        </p>
      </div>
      <div className="flex justify-end">
        {user && (
          <button
            onClick={openAccount}
            className="flex items-center gap-2 rounded-full border border-bg-border bg-bg-soft px-3 py-1.5 text-xs text-gray-300 hover:bg-bg-border"
          >
            <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <Badge variant={isBlocked ? 'error' : isPro ? 'brand' : 'neutral'}>
              {isBlocked ? 'Bloqueada' : isPro ? 'Pro' : 'Grátis'}
            </Badge>
            <span className="max-w-[140px] truncate">{user.email}</span>
            {trialLabel && <span className="text-gray-500">· {trialLabel}</span>}
            {bonusLabel && <span className="text-brand-light">· {bonusLabel}</span>}
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
