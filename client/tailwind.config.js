/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B4C52',
          hover: '#08393E',
          light: '#E6F2F3',
        },
        secondary: {
          DEFAULT: '#17878E',
          hover: '#126C72',
          light: '#E8F6F7',
        },
        accent: {
          DEFAULT: '#5CA627',
          hover: '#4A871F',
          light: '#F0F8EA',
        },
        background: '#FAF7F2',
        surface: '#FFFFFF',
        text: '#1C2620',
        muted: '#6E7180',
        success: '#17878E',
        warning: '#F59E0B',
        error: '#DC2626',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 8px 30px rgba(11, 76, 82, 0.08)',
        lifted: '0 12px 40px rgba(11, 76, 82, 0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
