/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007AFF',
          50: '#E6F3FF',
          100: '#CCE7FF',
          500: '#007AFF',
          600: '#0056CC',
          700: '#003D99',
        },
        secondary: {
          DEFAULT: '#34C759',
          50: '#E8F8EC',
          100: '#D1F2DA',
          500: '#34C759',
          600: '#28A745',
          700: '#1E7E34',
        },
        danger: {
          DEFAULT: '#FF3B30',
          50: '#FFE8E6',
          100: '#FFD1CC',
          500: '#FF3B30',
          600: '#E6342A',
          700: '#CC2E24',
        },
        warning: {
          DEFAULT: '#FF9500',
          50: '#FFF3E6',
          100: '#FFE7CC',
          500: '#FF9500',
          600: '#E6860A',
          700: '#CC7700',
        },
        dark: {
          DEFAULT: '#1C1C1E',
          50: '#F2F2F7',
          100: '#E5E5EA',
          800: '#1C1C1E',
          900: '#000000',
        },
      },
    },
  },
  plugins: [],
}