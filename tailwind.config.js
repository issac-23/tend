/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#0a0a0a',
        surface: '#161616',
        surface2: '#1f1f1f',
        border: '#2a2a2a',
        muted: '#7a7a7a',
        text: '#f5f5f5',
        accent: '#ffffff',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'pop': 'pop 180ms ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pop: { '0%': { transform: 'scale(0.96)' }, '60%': { transform: 'scale(1.03)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
