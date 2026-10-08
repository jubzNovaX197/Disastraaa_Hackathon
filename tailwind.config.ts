import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    // data/ files don't contain Tailwind classes — kept for completeness
    './src/data/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand accent: intelligence cyan ──────────────────────
        accent: {
          DEFAULT: '#22D3EE',
          dim: '#0891B2',
        },
        // ── Semantic status ───────────────────────────────────────
        safe:     '#10B981',
        warning:  '#F59E0B',
        critical: '#EF4444',
        info:     '#3B82F6',
        // ── Background surface hierarchy (adaptive Light & Dark mode) ──
        surface: {
          base:     'rgb(var(--surface-base-rgb, 8 12 24) / <alpha-value>)',
          bg:       'rgb(var(--surface-base-rgb, 8 12 24) / <alpha-value>)',
          card:     'rgb(var(--surface-card-rgb, 14 20 34) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated-rgb, 20 27 45) / <alpha-value>)',
          overlay:  'rgb(var(--surface-overlay-rgb, 26 34 54) / <alpha-value>)',
        },
      },
      fontFamily: {
        // Applied via next/font CSS variable in root layout
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
