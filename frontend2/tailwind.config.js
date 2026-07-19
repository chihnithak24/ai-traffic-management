/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#6366f1', 50:'#eef2ff', 100:'#e0e7ff', 200:'#c7d2fe', 500:'#6366f1', 600:'#4f46e5', 700:'#4338ca', 900:'#312e81' },
        accent:   { DEFAULT: '#0ea5e9', 400:'#38bdf8', 500:'#0ea5e9', 600:'#0284c7' },
        success:  '#22c55e',
        warning:  '#f59e0b',
        danger:   '#ef4444',
        emergency:'#dc2626',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      backdropBlur: { xs: '2px' },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up':   'slideUp 0.4s ease-out',
        'fade-in':    'fadeIn 0.3s ease-out',
        'bounce-in':  'bounceIn 0.5s ease-out',
      },
      keyframes: {
        slideUp:  { from: { transform: 'translateY(20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        bounceIn: { '0%': { transform: 'scale(0.8)', opacity: 0 }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow':  '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glow-red':   '0 0 20px rgba(239, 68, 68, 0.4)',
      }
    }
  },
  plugins: []
}
