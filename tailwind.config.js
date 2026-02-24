/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0D',
        surface: '#1A1A1A',
        'surface-2': '#242424',
        accent: '#F5C518',
        'accent-dim': '#F5C51866',
        text: '#F2F2F2',
        muted: '#6B7280',
        danger: '#EF4444'
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
          '0%': { filter: 'drop-shadow(0 0 0px #F5C518)' },
          '50%': { filter: 'drop-shadow(0 0 12px #F5C518)' },
          '100%': { filter: 'drop-shadow(0 0 4px #F5C51866)' }
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
