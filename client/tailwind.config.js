/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0C2C47',
          dark: '#071B2D',
          light: '#143C5E',
        },
        green: {
          DEFAULT: '#2D5652',
          dark: '#1F3C39',
          light: '#3C726D',
        },
        yellow: {
          DEFAULT: '#E2A54D',
          dark: '#C88B32',
          light: '#F4BA67',
        },
        aqua: {
          DEFAULT: '#97D3CD',
          dark: '#76BDB5',
          light: '#BAE3DF',
        },
        pink: {
          DEFAULT: '#EFEAE6',
          dark: '#E2D9D2',
          light: '#F8F5F3',
        },
        mint: {
          DEFAULT: '#E4F2EA',
          dark: '#CCE5D7',
          light: '#F1F9F4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
