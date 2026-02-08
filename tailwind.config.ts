import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Design System Colors
      colors: {
        // Background colors
        'bg-primary': '#0D0D0F',
        'bg-secondary': '#141416',
        'bg-tertiary': '#1A1A1D',
        
        // Text colors
        'text-primary': '#F5F5F7',
        'text-secondary': '#A1A1A6',
        'text-tertiary': '#6E6E73',
        'text-muted': '#48484A',
        
        // Accent colors
        'accent': '#C4A77D',
        'accent-hover': '#D4B88D',
        'accent-subtle': 'rgba(196, 167, 125, 0.15)',
        
        // Semantic colors
        'presence': '#C4A77D',
        'error': '#E57373',
        'success': '#81C784',
      },
      
      // Typography
      fontFamily: {
        'primary': ['var(--font-cormorant)', 'Cormorant Garamond', 'Times New Roman', 'serif'],
        'secondary': ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'monospace'],
      },
      
      fontSize: {
        'display': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '300' }],
        'display-mobile': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '300' }],
        'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
        'h1-mobile': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
        'h2': ['1.75rem', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '400' }],
        'h2-mobile': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '400' }],
        'h3': ['1.375rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
        'h3-mobile': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
        'body': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0.01em', fontWeight: '400' }],
        'body-mobile': ['1rem', { lineHeight: '1.6', letterSpacing: '0.01em', fontWeight: '400' }],
        'body-sm': ['1rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '400' }],
        'micro': ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.04em', fontWeight: '500' }],
      },
      
      // Spacing
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      
      // Border radius
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },
      
      // Shadows
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.2)',
        'soft': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'medium': '0 8px 24px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 40px rgba(196, 167, 125, 0.1)',
      },
      
      // Z-index
      zIndex: {
        'base': '0',
        'elevated': '10',
        'dropdown': '100',
        'overlay': '1000',
        'toast': '1100',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in-scale': 'fadeInScale 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'breathe': 'breathe 12s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.03' },
          '50%': { opacity: '0.06' },
        },
      },
      
      // Transitions
      transitionTimingFunction: {
        'slow': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'slower': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'exit': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
        'slower': '800ms',
        'slowest': '1200ms',
      },
    },
  },
  plugins: [],
};

export default config;
