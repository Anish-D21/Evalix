/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Evalix design system — see docs/architecture for usage rules.
        navy: '#0C2C47',
        green: '#2D5652',
        yellow: '#E2A54D',
        aqua: '#97D3CD',
        pink: '#EFEAE6',
        mint: '#E4F2EA',
      },
    },
  },
  plugins: [],
};
