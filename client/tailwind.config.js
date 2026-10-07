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
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6', // teal-500
          600: '#0d9488',
          700: '#0f766e',
        },
        dark: {
          900: '#0f172a', // slate-900
          800: '#1e293b', // slate-800
          700: '#334155', // slate-700
          600: '#475569',
        }
      }
    },
  },
  plugins: [],
}
