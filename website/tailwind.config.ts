import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#07070b',
          card: '#101118',
          soft: '#161826',
          border: '#242639'
        },
        brand: {
          DEFAULT: '#7c5cff',
          dark: '#5b3df0',
          light: '#a48bff'
        },
        accent: {
          blue: '#3b82f6',
          violet: '#8b5cf6'
        },
        success: '#22c55e',
        error: '#ef4444',
        warning: '#eab308'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #3b82f6 0%, #7c5cff 50%, #8b5cf6 100%)',
        'radial-fade': 'radial-gradient(circle at 50% 0%, rgba(124,92,255,0.18), transparent 60%)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px'
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.35)',
        glow: '0 0 40px rgba(124,92,255,0.25)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards'
      }
    }
  },
  plugins: []
}

export default config
