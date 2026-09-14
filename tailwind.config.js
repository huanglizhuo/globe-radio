/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        walnut: {
          950: 'var(--color-walnut-950)',
          900: 'var(--color-walnut-900)',
          800: 'var(--color-walnut-800)',
          700: 'var(--color-walnut-700)',
          600: 'var(--color-walnut-600)',
        },
        ivory: {
          100: 'var(--color-ivory-100)',
          300: 'var(--color-ivory-300)',
          500: 'var(--color-ivory-500)',
        },
        signal: 'var(--color-signal)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          press: 'var(--color-accent-press)',
        },
        danger: 'var(--color-danger)',
        'veil-chip': 'var(--color-veil-chip)',
        'veil-control': 'var(--color-veil-control)',
        'veil-control-hover': 'var(--color-veil-control-hover)',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        lcd: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1.05rem', letterSpacing: '0.02em' }],
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        dock: 'var(--shadow-dock)',
      },
    },
  },
  plugins: [],
}
