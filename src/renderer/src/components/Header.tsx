import { useAppStore } from '../state/useAppStore'
import { useAuthStore } from '../state/useAuthStore'

function Header(): JSX.Element {
  const openAccount = useAppStore((s) => s.openAccount)
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
      <div />
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          TTK VIDEO <span className="text-brand-light">MIXER</span>
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
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                isBlocked ? 'bg-error text-white' : isPro ? 'bg-brand text-white' : 'bg-bg-border text-gray-400'
              }`}
            >
              {isBlocked ? 'Bloqueada' : isPro ? 'Pro' : 'Grátis'}
            </span>
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
