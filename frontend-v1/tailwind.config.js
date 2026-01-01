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
          50: '#e6f7ff',
          100: '#b3e5fc',
          200: '#81d4fa',
          300: '#4fc3f7',
          400: '#29b6f6',
          500: '#00d4ff',
          600: '#00a8cc',
          700: '#007c99',
          800: '#005066',
          900: '#002433',
        },
        dark: {
          100: '#415a77',
          200: '#1b263b',
          300: '#0d1b2a',
          400: '#091520',
        },
        severity: {
          severe: '#ef233c',
          medium: '#f77f00',
          normal: '#4895ef',
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
