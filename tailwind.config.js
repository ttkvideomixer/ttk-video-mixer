/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0d12',
          card: '#151822',
          soft: '#1c202c',
          border: '#262b3a'
        },
        brand: {
          DEFAULT: '#7c5cff',
          dark: '#5b3df0',
          light: '#a48bff'
        },
        success: '#22c55e',
        error: '#ef4444',
        warning: '#eab308'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px'
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
}
