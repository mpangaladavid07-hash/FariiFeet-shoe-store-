/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Theme is switched by adding/removing `dark` on <html> (see index.html + useThemeMode).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0C0B',
        charcoal: '#171514',
        espresso: '#453A33',
        mocha: '#888178',
        blush: '#E2BBC7',
        rose: '#F6F2F3',
        emerald: '#10B981',
        // Stage-1 editorial palette (dark stage surfaces, never re-themed)
        navy: '#1E293B',
        'navy-deep': '#243040',
        'navy-soft': '#2C3A4E',
        // Theme-aware neutrals. Light values live in :root, dark values under
        // `html.dark` (src/index.css), so every `bg-shell`, `text-plum`, … class
        // flips automatically when the theme changes.
        shell: 'rgb(var(--c-page) / <alpha-value>)',
        'shell-soft': 'rgb(var(--c-page-soft) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        blushline: 'rgb(var(--c-line) / <alpha-value>)',
        plum: 'rgb(var(--c-ink) / <alpha-value>)',
        'plum-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // WhatsApp-style UI stack: system faces, so small labels read native
        // (SF Pro / Segoe UI / Roboto) instead of a generic webfont.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
        // Compact chat-style numerals/labels.
        chat: [
          '"SF Pro Text"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 0 80px -20px rgba(226, 187, 199, 0.45)',
        'blush-btn': '0 18px 40px -18px rgba(226, 187, 199, 0.75)',
        card: '0 30px 60px -30px rgba(0, 0, 0, 0.85)',
        soft: '0 26px 60px -36px rgba(59, 43, 51, 0.38)',
        'hero-card': '0 40px 80px -42px rgba(8, 15, 26, 0.9)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(12px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        marquee: 'marquee 26s linear infinite',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.35s ease-out both',
        'slide-in': 'slide-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
      },
    },
  },
  plugins: [],
}
