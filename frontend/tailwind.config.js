// Fixed frontend/tailwind.config.js - Enhanced configuration for decision modeling UI
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors for decision modeling theme
      colors: {
        // Decision node colors (blue theme)
        decision: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Chance node colors (red theme)
        chance: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Terminal node colors (green theme)
        terminal: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Analysis and utility colors
        analysis: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        }
      },
      
      // Custom fonts
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      
      // Custom spacing for tree visualization
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      
      // Animation for tree interactions
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s infinite',
        'tree-expand': 'treeExpand 0.4s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        treeExpand: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      // Custom shadows for depth
      boxShadow: {
        'node': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'node-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'node-selected': '0 0 0 3px rgba(59, 130, 246, 0.3)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      
      // Custom border radius for nodes
      borderRadius: {
        'node': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      
      // Custom widths for tree layout
      width: {
        'node-decision': '6rem',
        'node-chance': '5rem',
        'node-terminal': '5rem',
        'sidebar': '20rem',
        'tree-panel': '60rem',
      },
      
      // Custom heights for tree layout
      height: {
        'node-decision': '4rem',
        'node-chance': '5rem',
        'node-terminal': '4rem',
        'tree-canvas': 'calc(100vh - 12rem)',
      },
      
      // Custom z-index values
      zIndex: {
        'modal': '1000',
        'dropdown': '100',
        'tooltip': '200',
        'tree-node': '10',
        'tree-connection': '5',
      },
      
      // Typography scale for different content types
      fontSize: {
        'node': ['0.875rem', { lineHeight: '1.25rem' }],
        'node-sm': ['0.75rem', { lineHeight: '1rem' }],
        'tree-label': ['0.8125rem', { lineHeight: '1.125rem' }],
      },
      
      // Custom gradients
      backgroundImage: {
        'gradient-decision': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        'gradient-chance': 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        'gradient-terminal': 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
        'gradient-analysis': 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
      },
      
      // Screen breakpoints for responsive tree visualization
      screens: {
        'tree-sm': '640px',
        'tree-md': '768px',
        'tree-lg': '1024px',
        'tree-xl': '1280px',
        'tree-2xl': '1536px',
      },
    },
  },
  plugins: [
    // Add additional plugins as needed
    require('@tailwindcss/forms')({
      strategy: 'class', // Use class-based strategy
    }),
    require('@tailwindcss/typography'),
    // Custom plugin for node shapes
    function({ addUtilities }) {
      const newUtilities = {
        '.node-decision': {
          borderRadius: '0.5rem',
        },
        '.node-chance': {
          borderRadius: '50%',
        },
        '.node-terminal': {
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        },
        '.tree-connection': {
          background: 'linear-gradient(90deg, #d1d5db 0%, #9ca3af 50%, #d1d5db 100%)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
  
  // Safelist classes that might be dynamically generated
  safelist: [
    'bg-decision-500',
    'bg-chance-500', 
    'bg-terminal-500',
    'text-decision-900',
    'text-chance-900',
    'text-terminal-900',
    'border-decision-500',
    'border-chance-500',
    'border-terminal-500',
    'shadow-node',
    'shadow-node-hover',
    'shadow-node-selected',
  ],
}