import { Link } from 'react-router-dom'
import { BellIcon, SettingsIcon, SunIcon, MoonIcon } from './icons'
import { useTheme } from '../context/ThemeContext'
import { useAlertsBadge } from '../hooks/useAlertsBadge'

export default function Navbar() {
  const { theme, update } = useTheme()
  const badge = useAlertsBadge()

  return (
    <header className="sticky top-0 z-40 glass border-b border-line h-16 flex items-center">
      <div className="w-full px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center font-display font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--emerald))' }}
          >
            ZA
          </div>
          <div className="leading-tight">
            <p className="font-display font-bold text-lg brand-gradient">Zero Artifacts</p>
            <p className="text-[10px] text-dim tracking-wide -mt-0.5">MPLADS Risk Intelligence</p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => update({ theme: theme === 'dark' ? 'light' : 'dark' })}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-surface-2 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon className="w-[18px] h-[18px]" /> : <MoonIcon className="w-[18px] h-[18px]" />}
          </button>
          <Link
            to="/alerts"
            className="relative h-9 w-9 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-surface-2 transition-colors"
            title="Alerts"
          >
            <BellIcon className="w-[18px] h-[18px]" />
            {badge > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rust border-2 border-surface animate-pulseGlow" />
            )}
          </Link>
          <Link
            to="/settings"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-surface-2 transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>
    </header>
  )
}
