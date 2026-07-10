import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        zara: {
          black: '#111111',
          gray: '#6f6f6f',
          paper: '#f7f7f5'
        },
        ink: '#0b0d12',
        fog: '#f4f1ed',
        ember: '#ff6b3d',
        emberDark: '#e0552f',
        mint: '#b6f1d8',
        dusk: '#1e1a2b',
        slate: '#8a8f98'
      },
      fontFamily: {
        zara: ['Arial', 'Helvetica', 'sans-serif'],
        display: ['"Avenir Next"', 'Avenir', '"Helvetica Neue"', 'ui-sans-serif', 'system-ui'],
        body: ['Inter', '"Helvetica Neue"', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        soft: '0 20px 60px -30px rgba(0,0,0,0.5)'
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at 10% 10%, rgba(255, 107, 61, 0.25), transparent 50%)',
        'mesh': 'radial-gradient(circle at 20% 20%, rgba(255, 107, 61, 0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(182, 241, 216, 0.2), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.12), transparent 40%)'
      }
    }
  },
  plugins: []
};

export default config;
