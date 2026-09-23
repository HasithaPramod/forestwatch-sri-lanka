import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c1914',
        cream: '#f3eee2',
        mist: '#e4ecdf',
        forest: {
          900: '#10261e',
          800: '#16382c',
          700: '#1f4d3a',
          600: '#2f6f4e',
          500: '#3d8a61',
        },
        copper: '#b0793a',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'var(--font-sinhala)', 'var(--font-tamil)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
