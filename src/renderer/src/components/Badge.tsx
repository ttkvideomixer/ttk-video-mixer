import type { ReactNode } from 'react'

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'error'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-bg-border text-gray-400',
  brand: 'bg-brand text-black',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error text-black'
}

interface Props {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

function Badge({ variant = 'neutral', children, className = '' }: Props): JSX.Element {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
