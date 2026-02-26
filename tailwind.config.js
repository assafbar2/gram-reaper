/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        bg: '#C49A0A',
        surface: '#B38900',
        'surface-2': '#9A7500',
        accent: '#1A1400',
        'accent-dim': '#1A140066',
        text: '#000000',
        muted: '#2D1F00',
        danger: '#7A1500'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'ring-pulse': 'ring-pulse 0.6s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'toast-in': 'toast-in 0.25s ease-out'
      },
      keyframes: {
        'ring-pulse': {
          '0%': { filter: 'drop-shadow(0 0 0px #1A1400)' },
          '50%': { filter: 'drop-shadow(0 0 12px #1A1400)' },
          '100%': { filter: 'drop-shadow(0 0 4px #1A140066)' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        }
      }
    }
  },
  plugins: []
}
