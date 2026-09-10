import { riskBadgeClasses } from '../lib/format'

export function RiskBadge({ band }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${riskBadgeClasses(
        band
      )}`}
    >
      {band}
    </span>
  )
}

export function FlagPill({ label, active }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mr-1 mb-1 transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-surface2 text-dim line-through decoration-line'
      }`}
    >
      {label}
    </span>
  )
}

export function CollusionDot({ count }) {
  const color = count >= 3 ? 'bg-risk-critical' : count >= 1 ? 'bg-risk-high' : 'bg-risk-low'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {count}
    </span>
  )
}
