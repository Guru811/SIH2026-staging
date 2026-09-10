import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NAV_ITEMS } from './navItems'

export default function Sidebar() {
  return (
    <nav
      className="hidden md:flex fixed top-16 bottom-0 left-0 w-20 bg-surface border-r border-line flex-col items-center pt-4 gap-1 z-30"
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="relative w-16 flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-[11px] font-medium group"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg border-l-2"
                  style={{
                    borderColor: 'var(--accent)',
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--accent) 14%, transparent), transparent)'
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <item.Icon
                className={`relative w-5 h-5 transition-transform duration-200 group-hover:animate-floatIcon ${
                  isActive ? '' : 'text-dim group-hover:text-ink'
                }`}
                style={isActive ? { color: 'var(--accent)' } : undefined}
              />
              <span
                className={`relative ${isActive ? 'font-semibold' : 'text-dim group-hover:text-ink'}`}
                style={isActive ? { color: 'var(--accent)' } : undefined}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
