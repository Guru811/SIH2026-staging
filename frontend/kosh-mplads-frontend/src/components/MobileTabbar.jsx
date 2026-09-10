import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NAV_ITEMS } from './navItems'

export default function MobileTabbar() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-line flex z-30 overflow-x-auto scrollbar-none"
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="relative flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1 text-[10px] font-medium"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="tabbar-active"
                  className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <item.Icon
                className={`w-[19px] h-[19px] transition-transform ${isActive ? '-translate-y-0.5' : 'text-dim'}`}
                style={isActive ? { color: 'var(--accent)' } : undefined}
              />
              <span className={isActive ? '' : 'text-dim'} style={isActive ? { color: 'var(--accent)' } : undefined}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
