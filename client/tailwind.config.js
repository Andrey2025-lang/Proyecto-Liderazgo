/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f1f7f3',
          100: '#dcebe1',
          200: '#bcd8c6',
          300: '#91bda3',
          400: '#639d7d',
          500: '#438060',
          600: '#31664c',
          700: '#28523e',
          800: '#214233',
          900: '#123b2e',
          950: '#0a241c',
        },
        cream: '#f7f3ea',
        sand: '#eadfca',
        gold: '#c9a227',
        ink: '#1e2420',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgba(18, 59, 46, 0.35)',
        card: '0 10px 30px -18px rgba(18, 59, 46, 0.25)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
