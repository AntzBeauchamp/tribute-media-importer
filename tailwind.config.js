/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f7f3',
          100: '#e0ede0',
          400: '#96b591',
          500: '#7ea172',
          600: '#4e6766',
          700: '#3c5251'
        },
        warm: {
          50: '#f7f6f4',
          100: '#eeebe8',
          500: '#837c73',
          600: '#6e6760'
        }
      }
    }
  },
  plugins: []
};
