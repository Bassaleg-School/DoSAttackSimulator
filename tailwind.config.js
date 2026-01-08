/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './js/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f172a',
        surfaceAlt: '#1f2937'
      }
    }
  },
  plugins: []
};
