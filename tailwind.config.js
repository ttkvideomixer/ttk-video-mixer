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
          DEFAULT: '#25f4ee',
          dark: '#12c7c0',
          light: '#7ffaf5'
        },
        success: '#22c55e',
        error: '#fe2c55',
        warning: '#eab308',
        cyan: '#25f4ee',
        pink: '#fe2c55'
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif']
      },
      backgroundImage: {
        'tiktok-gradient': 'linear-gradient(135deg, #25f4ee 0%, #fe2c55 100%)',
        'cyan-blue-gradient': 'linear-gradient(135deg, #25f4ee 0%, #3b82f6 100%)',
        'pink-red-gradient': 'linear-gradient(135deg, #fe2c55 0%, #ef4444 100%)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px'
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.5)',
        glow: '0 0 30px rgba(37,244,238,0.2)'
      }
    }
  },
  plugins: []
}
