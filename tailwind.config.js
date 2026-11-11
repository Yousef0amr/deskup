/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', '"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'Consolas', 'monospace']
      },
      boxShadow: {
        sm: '0 1px 2px rgb(var(--shadow) / 0.06)',
        DEFAULT: '0 1px 3px rgb(var(--shadow) / 0.08)',
        md: '0 2px 6px -1px rgb(var(--shadow) / 0.08)',
        lg: '0 6px 16px -4px rgb(var(--shadow) / 0.12)',
        xl: '0 12px 28px -6px rgb(var(--shadow) / 0.18)',
        '2xl': '0 24px 48px -12px rgb(var(--shadow) / 0.28)'
      },
      colors: {
        // One accent for the whole app. Existing `indigo-*` classes resolve to it.
        indigo: {
          50: '#eef3ff', 100: '#dde6fe', 200: '#c2d2fd', 300: '#98b3fa', 400: '#6a8cf4',
          500: '#4a6bec', 600: '#3753df', 700: '#2e42c4', 800: '#2b399e', 900: '#29357d', 950: '#1b214b'
        },
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        hover: 'rgb(var(--hover) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)'
      },
      scale: { 98: '0.98' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-up': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(24px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        highlight: { '0%, 100%': { boxShadow: '0 0 0 0 rgb(74 107 236 / 0)' }, '30%': { boxShadow: '0 0 0 3px rgb(74 107 236 / 0.35)' } }
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-up': 'scale-up 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'page-in': 'slide-up 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        highlight: 'highlight 1.2s ease-out',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
  },
  plugins: []
}
