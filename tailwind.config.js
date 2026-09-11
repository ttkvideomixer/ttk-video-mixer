/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
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
          DEFAULT: '#fe2c55',
          dark: '#e0224f',
          light: '#ff9bb8'
        },
        success: '#22c55e',
        error: '#ef4444',
        warning: '#eab308',
        cyan: '#25f4ee',
        pink: '#fe2c55'
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif']
      },
      backgroundImage: {
        // Flattened to solid pink on purpose — rosa predomina, ciano é só
        // detalhe pontual (ex: PreviewOverlayBox), não em toda a interface.
        'tiktok-gradient': 'linear-gradient(135deg, #fe2c55 0%, #fe2c55 100%)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px'
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.5)',
        glow: '0 0 30px rgba(254,44,85,0.25)'
      }
    }
  },
  plugins: []
}
