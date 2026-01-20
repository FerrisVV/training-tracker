/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'md-primary': 'rgb(var(--md-primary) / <alpha-value>)',
        'md-on-primary': 'rgb(var(--md-on-primary) / <alpha-value>)',
        'md-primary-container': 'rgb(var(--md-primary-container) / <alpha-value>)',
        'md-on-primary-container': 'rgb(var(--md-on-primary-container) / <alpha-value>)',
        'md-secondary': 'rgb(var(--md-secondary) / <alpha-value>)',
        'md-on-secondary': 'rgb(var(--md-on-secondary) / <alpha-value>)',
        'md-secondary-container': 'rgb(var(--md-secondary-container) / <alpha-value>)',
        'md-tertiary': 'rgb(var(--md-tertiary) / <alpha-value>)',
        'md-surface': 'rgb(var(--md-surface) / <alpha-value>)',
        'md-on-surface': 'rgb(var(--md-on-surface) / <alpha-value>)',
        'md-surface-variant': 'rgb(var(--md-surface-variant) / <alpha-value>)',
        'md-on-surface-variant': 'rgb(var(--md-on-surface-variant) / <alpha-value>)',
        'md-background': 'rgb(var(--md-background) / <alpha-value>)',
        'md-error': 'rgb(var(--md-error) / <alpha-value>)',
      },
      borderRadius: {
        'md-sm': '8px',
        'md-md': '12px',
        'md-lg': '16px',
        'md-xl': '28px',
        'md-full': '999px',
      },
      fontFamily: {
        'sans': ['Roboto', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
