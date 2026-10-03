/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // User's exact 5-color palette:
        brand: {
          carbon: {
            DEFAULT: '#172121', // Carbon Black
            50: '#F4F6F6',
            100: '#E4E8E8',
            200: '#C5CDCD',
            300: '#9BA9A9',
            400: '#697B7B',
            500: '#435454',
            600: '#2C3A3A',
            700: '#1F2A2A',
            800: '#172121',
            900: '#0E1515',
            950: '#080C0C',
          },
          charcoal: {
            DEFAULT: '#444554', // Charcoal Blue
            50: '#F5F5F7',
            100: '#E7E8EB',
            200: '#CFD0D7',
            300: '#AEB0BB',
            400: '#7E8193',
            500: '#5C5E71',
            600: '#444554',
            700: '#343542',
            800: '#252630',
            900: '#1A1B22',
          },
          granite: {
            DEFAULT: '#7F7B82', // Rosy Granite
            50: '#FAF9FA',
            100: '#F2F1F3',
            200: '#E2E0E4',
            300: '#C8C5CB',
            400: '#A4A0A8',
            500: '#7F7B82',
            600: '#656168',
            700: '#4E4B51',
            800: '#38363A',
            900: '#222123',
          },
          lilac: {
            DEFAULT: '#BFACB5', // Lilac Ash
            50: '#FAF8F9',
            100: '#F3EFF1',
            200: '#E4DCE0',
            300: '#D2C4CC',
            400: '#BFACB5',
            500: '#A38D98',
            600: '#836F7A',
            700: '#64545D',
            800: '#473B42',
            900: '#2D252A',
          },
          silk: {
            DEFAULT: '#E5D0CC', // Almond Silk
            50: '#FDFCFB',
            100: '#FAF6F5',
            200: '#F3ECE9',
            300: '#EBDCD8',
            400: '#E5D0CC',
            500: '#CCA8A1',
            600: '#AE837A',
            700: '#8A635B',
            800: '#63453E',
            900: '#3E2A26',
          },
          // Logo accent silver/ice-blue
          ice: {
            DEFAULT: '#7EB8DA',
            light: '#BDE4F8',
            dark: '#458EB9',
            glow: '#67C5F5',
          },
        },
        // Harmonized semantic tokens to preserve backward compatibility:
        navy: {
          DEFAULT: '#172121', // Mapped to Carbon Black
          dark: '#0E1515',
          light: '#233030',
        },
        green: {
          DEFAULT: '#2F4F4A',
          dark: '#1C3531',
          light: '#4B736B',
        },
        yellow: {
          DEFAULT: '#C99E5C',
          dark: '#A67C3B',
          light: '#DEB678',
        },
        aqua: {
          DEFAULT: '#7EB8DA',
          dark: '#5894B7',
          light: '#B2DAEF',
        },
        pink: {
          DEFAULT: '#E5D0CC', // Mapped to Almond Silk
          dark: '#D3B8B3',
          light: '#F8F2F0',
        },
        mint: {
          DEFAULT: '#DCE8E3',
          dark: '#C0D5CB',
          light: '#EEF5F1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-ice': '0 0 16px -2px rgba(126, 184, 218, 0.45)',
        'glow-lilac': '0 0 16px -2px rgba(191, 172, 181, 0.45)',
        'glow-silk': '0 0 16px -2px rgba(229, 208, 204, 0.35)',
        'card-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'badge-pulse': 'badgePulse 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 3.5s ease-in-out infinite',
      },
      keyframes: {
        badgePulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
    },
  },
  plugins: [],
};
