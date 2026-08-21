/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Background gradient
        'bg-gradient-start': '#EDE9FB',
        'bg-gradient-end': '#D9CFF3',
        // Surfaces
        'surface-white': '#FFFFFF',
        'surface-soft': '#F7F5FC',
        // Primary purple scale
        primary: {
          DEFAULT: '#8B5CF6',
          dark: '#6D28D9',
          light: '#C4B5FD',
        },
        // Accent
        'accent-lilac': '#A78BFA',
        // Text
        'text-primary': '#1E1B2E',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
        // Semantic
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        // Borders
        'border-subtle': '#EEECF7',
      },
      boxShadow: {
        card: '0 4px 24px rgba(139, 92, 246, 0.12)',
        'card-hover': '0 8px 32px rgba(139, 92, 246, 0.18)',
        'card-lg': '0 12px 48px rgba(139, 92, 246, 0.15)',
        float: '0 20px 60px rgba(139, 92, 246, 0.20)',
      },
      borderRadius: {
        card: '20px',
        'card-sm': '16px',
        pill: '999px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        grow: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s ease infinite',
        grow: 'grow 2.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
