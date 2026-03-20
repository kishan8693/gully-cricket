/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 900: '#0f172a', 800: '#1e293b', 700: '#334155', 600: '#475569' },
        accent: { gold: '#f0c040', green: '#22c55e', red: '#ef4444', cyan: '#06b6d4' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
