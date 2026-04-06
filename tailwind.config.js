/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
          overlay: 'rgb(var(--color-surface-overlay) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--color-content) / <alpha-value>)',
          base: 'rgb(var(--color-content-base) / <alpha-value>)',
          subtle: 'rgb(var(--color-content-subtle) / <alpha-value>)',
          muted: 'rgb(var(--color-content-muted) / <alpha-value>)',
          faint: 'rgb(var(--color-content-faint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          soft: 'rgb(var(--color-accent-soft) / <alpha-value>)',
          fg: 'rgb(var(--color-accent-fg) / <alpha-value>)',
        },
        separator: 'rgb(var(--color-separator) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        'palette-0': 'rgb(var(--color-palette-0) / <alpha-value>)',
        'palette-1': 'rgb(var(--color-palette-1) / <alpha-value>)',
        'palette-2': 'rgb(var(--color-palette-2) / <alpha-value>)',
        'palette-3': 'rgb(var(--color-palette-3) / <alpha-value>)',
        'palette-4': 'rgb(var(--color-palette-4) / <alpha-value>)',
        'palette-5': 'rgb(var(--color-palette-5) / <alpha-value>)',
      },
      boxShadow: {
        elevated: 'var(--shadow-elevated)',
        toast: 'var(--shadow-toast)',
      },
    },
  },
  plugins: [],
};
