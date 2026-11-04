import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: '#fdf2f4',
          100: '#fbe8ec',
          200: '#f7d1d9',
          300: '#f0abb8',
          400: '#e4788f',
          500: '#d44c68',
          600: '#bd3350',
          700: '#9e233d',
          800: '#800020', // Vino Borgoña Clásico Whitman
          900: '#580c19', // Vino Oscuro / Borgoña Profundo
          950: '#38040d',
        },
        lionGold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        }
      },
      boxShadow: {
        'burgundy-glow': '0 0 25px -5px rgba(128, 0, 32, 0.4)',
        'gold-glow': '0 0 25px -5px rgba(245, 158, 11, 0.4)',
      }
    },
  },
  plugins: [],
};
export default config;

