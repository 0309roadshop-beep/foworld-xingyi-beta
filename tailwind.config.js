/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* 深林蓝绿底色 */
        void: {
          DEFAULT: '#071218',
          950: '#040d12',
          900: '#071218',
          800: '#0f2430',
          700: '#152e3c',
          600: '#1c3a4a',
        },
        /* 万峰林翠绿 — 兼容旧 bronze 类名 */
        bronze: {
          DEFAULT: '#2dd4a8',
          50: '#ecfdf8',
          100: '#d1faf0',
          200: '#a7f3e0',
          300: '#5eecc4',
          400: '#2dd4a8',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        jade: {
          DEFAULT: '#2dd4a8',
          bright: '#5eecc4',
          muted: '#10b981',
          dim: '#065f46',
          deep: '#064e3b',
        },
        sky: {
          DEFAULT: '#38bdf8',
          bright: '#7dd3fc',
          muted: '#0ea5e9',
          dim: '#0369a1',
          deep: '#0c4a6e',
        },
        gold: {
          glow: '#f5e06a',
          bright: '#fde68a',
          muted: '#e8c547',
          dim: '#a8973f',
        },
        spirit: {
          DEFAULT: '#34d399',
          dim: '#065f46',
        },
        mist: {
          DEFAULT: '#e8f4f8',
          muted: '#94b8c8',
          faint: '#5a7a8a',
        },
      },
      fontFamily: {
        sans: [
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'system-ui',
          'sans-serif',
        ],
        display: ['PingFang SC', 'STSong', 'SimSun', 'serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(45, 212, 168, 0.3)',
        'glow-lg': '0 0 40px rgba(45, 212, 168, 0.35)',
        'glow-gold': '0 0 24px rgba(245, 224, 106, 0.35)',
        'inner-glow': 'inset 0 0 20px rgba(56, 189, 248, 0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mythic-gradient':
          'linear-gradient(160deg, #071218 0%, #0f2430 45%, #0c4a6e 100%)',
        'gold-shimmer':
          'linear-gradient(90deg, transparent 0%, rgba(245,224,106,0.12) 50%, transparent 100%)',
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        shimmer: 'shimmer 3s ease-in-out infinite',
        'float-y': 'float-y 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
