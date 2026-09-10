import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const ACCENTS = {
  violet: '#6c58e0',
  gold: '#b87d12',
  emerald: '#16916f',
  rust: '#d3355a',
  slate: '#5b6478'
}

const DEFAULTS = {
  theme: 'light', // 'light' | 'dark'
  accent: 'violet',
  density: 'comfortable', // 'comfortable' | 'compact'
  motion: true,
  notifyHigh: true,
  notifyMedium: false
}

function load() {
  try {
    const raw = localStorage.getItem('kosh-prefs')
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch (e) {
    /* ignore malformed storage */
  }
  return DEFAULTS
}

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(load)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', prefs.theme)
    root.setAttribute('data-density', prefs.density)
    root.style.setProperty('--accent', ACCENTS[prefs.accent] || ACCENTS.violet)
    document.body.classList.toggle('motion-off', !prefs.motion)
    try {
      localStorage.setItem('kosh-prefs', JSON.stringify(prefs))
    } catch (e) {
      /* storage may be unavailable (private browsing etc.) — fail silently */
    }
  }, [prefs])

  function update(patch) {
    setPrefs((p) => ({ ...p, ...patch }))
  }

  return (
    <ThemeContext.Provider value={{ ...prefs, accents: ACCENTS, update }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
