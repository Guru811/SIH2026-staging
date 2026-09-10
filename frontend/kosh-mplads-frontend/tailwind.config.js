/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic, theme-aware tokens backed by CSS variables (see index.css).
        // Letting these resolve to var(...) means light/dark + accent swapping
        // works everywhere these classes are used, no per-component branching.
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        page: 'var(--page-bg)',
        line: 'var(--line)',
        ink: 'var(--text)',
        dim: 'var(--text-dim)',
        accent: 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        gold: 'var(--gold)',
        emerald: 'var(--emerald)',
        rust: 'var(--rust)',
        violet: 'var(--violet)',
        slateblue: 'var(--slate)',
        // Fixed risk-severity colors (data semantics, not skinned by theme)
        risk: {
          critical: '#dc2626',
          high: '#f97316',
          medium: '#d97706',
          low: '#16a34a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', '"Times New Roman"', 'serif']
      },
      boxShadow: {
        card: 'var(--card-shadow)'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' }
        },
        shimmerBg: {
          '0%': { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '200% center' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-12px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        floatIcon: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(211,53,90,.45)' },
          '50%': { boxShadow: '0 0 0 6px rgba(211,53,90,0)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite linear',
        shimmerBg: 'shimmerBg 6s ease-in-out infinite alternate',
        slideDown: 'slideDown .35s ease-out',
        floatIcon: 'floatIcon 1s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
