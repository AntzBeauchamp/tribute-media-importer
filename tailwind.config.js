/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fb',
          100: '#e7ecf5',
          500: '#4a6fa5',
          600: '#3d5d8a',
          700: '#314a6e'
        }
      }
    }
  },
  plugins: []
};
