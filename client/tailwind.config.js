/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5fbf6',
          100: '#e8f5e9',
          200: '#d8eed9',
          300: '#bce2bf',
          400: '#98d59d',
          500: '#66bb6a',
          600: '#4ea65a',
          700: '#3f8a4c',
          800: '#336f3f',
          900: '#2b5d35',
        },
        accent: '#66bb6a',
        surface: {
          base: '#e8f5e9',
          soft: '#f1faf2',
          deep: '#c8e6c9',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        neu: '1.1rem',
      },
      boxShadow: {
        neu: '8px 8px 16px #c8e6c9, -8px -8px 16px #ffffff',
        'neu-sm': '6px 6px 12px #cfe7d1, -6px -6px 12px #ffffff',
        'neu-inset': 'inset 4px 4px 8px #c8e6c9, inset -4px -4px 8px #ffffff',
        'neu-pressed': 'inset 6px 6px 12px #c8e6c9, inset -6px -6px 12px #ffffff',
      },
      keyframes: {
        'soft-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'soft-in': 'soft-in 400ms ease-out',
      },
    },
  },
  plugins: [],
}

