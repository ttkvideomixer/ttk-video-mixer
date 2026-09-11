import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'gradient' | 'secondary' | 'danger' | 'ghost'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-black hover:bg-brand-dark',
  gradient: 'bg-tiktok-gradient text-black shadow-glow hover:opacity-90',
  secondary: 'bg-bg-soft border border-bg-border text-white hover:bg-bg-border',
  danger: 'bg-error text-black hover:opacity-90',
  ghost: 'text-gray-300 hover:bg-bg-soft hover:text-white'
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

/**
 * Shared button primitive for the reskin — bright accent colors (ciano/pink)
 * always pair with black text, never white (they're too light for AA
 * contrast). Microanimation is deliberately small/fast (150ms) per the
 * "sensação de velocidade" brief, not a slow, heavy transition.
 */
function Button({ variant = 'primary', className = '', type = 'button', ...rest }: Props): JSX.Element {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  )
}

export default Button
