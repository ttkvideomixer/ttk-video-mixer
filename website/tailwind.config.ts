import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#000000',
          card: '#111111',
          soft: '#1a1a1a',
          border: '#2a2a2a'
        },
        brand: {
          DEFAULT: '#25f4ee',
          dark: '#12c7c0',
          light: '#7ffaf5'
        },
        accent: {
          blue: '#3b82f6',
          violet: '#8b5cf6'
        },
        cyan: '#25f4ee',
        pink: '#fe2c55',
        success: '#22c55e',
        error: '#fe2c55',
        warning: '#eab308'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #25f4ee 0%, #fe2c55 100%)',
        'radial-fade': 'radial-gradient(circle at 50% 0%, rgba(37,244,238,0.14), transparent 60%)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px'
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.5)',
        glow: '0 0 40px rgba(37,244,238,0.22)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'hype-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0px rgba(37,244,238,0), 0 0 18px rgba(254,44,85,0.35)'
          },
          '50%': {
            transform: 'scale(1.04)',
            boxShadow: '0 0 30px rgba(37,244,238,0.9), 0 0 55px rgba(254,44,85,0.6)'
          }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'hype-pulse': 'hype-pulse 1.8s ease-in-out infinite'
      }
    }
  },
  plugins: []
}

export default config
