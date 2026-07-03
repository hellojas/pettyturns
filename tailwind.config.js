/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Desert-tabletop palette (placeholder, refine later)
        sand: {
          50: '#fdf8ef',
          100: '#f7ecd7',
          200: '#eed7ab',
          300: '#e3bd78',
          400: '#d89f4b',
          500: '#cd8630',
          600: '#b56b26',
          700: '#965222',
          800: '#7b4222',
          900: '#65371f',
        },
        dusk: {
          800: '#2b2118',
          900: '#1c150f',
        },
      },
    },
  },
  plugins: [],
};
