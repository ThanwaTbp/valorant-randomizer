import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // โทน Valorant: แดง-ส้ม + น้ำเงินเข้ม + ขาวมุก
        val: {
          red: '#ff4655',
          dark: '#0f1923',
          darker: '#0a141f',
          light: '#ece8e1',
          accent: '#1f2731',
          mint: '#5cffe1',
        },
      },
      fontFamily: {
        rajdhani: ['var(--font-rajdhani)', 'sans-serif'],
        bebas: ['var(--font-bebas)', 'sans-serif'],
        kanit: ['var(--font-kanit)', 'sans-serif'],
      },
      keyframes: {
        'glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 70, 85, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 70, 85, 0.9)' },
        },
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
