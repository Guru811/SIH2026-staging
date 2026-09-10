// Indian numbering (lakh/crore grouping) — used everywhere per Global UX Rule #1
export function formatINR(value) {
  const n = Number(value) || 0
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// Large rupee amounts as "₹123.4 Cr" — value is expected in raw rupees
export function formatCr(value, digits = 1) {
  const n = Number(value) || 0
  const cr = n / 1e7
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })} Cr`
}

export function formatNumber(value) {
  const n = Number(value) || 0
  return n.toLocaleString('en-IN')
}

export function formatPercent(value, digits = 1) {
  const n = Number(value) || 0
  return `${n.toFixed(digits)}%`
}

// ---- Risk band helpers (Global UX Rule #2) ----
export const RISK_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#f97316',
  MEDIUM: '#d97706',
  LOW: '#16a34a'
}

export function riskColor(band) {
  return RISK_COLORS[String(band || '').toUpperCase()] || '#6b7280'
}

export function riskBadgeClasses(band) {
  const key = String(band || '').toUpperCase()
  const map = {
    CRITICAL: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    HIGH: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
    MEDIUM: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    LOW: 'bg-green-100 text-green-700 ring-1 ring-green-200'
  }
  return map[key] || 'bg-surface2 text-dim ring-1 ring-line'
}

// Integrity score (0-100) -> band, per Page 2 of the spec
export function integrityBand(score) {
  const s = Number(score)
  if (s <= 40) return 'CRITICAL'
  if (s <= 60) return 'HIGH'
  if (s <= 80) return 'MEDIUM'
  return 'LOW'
}

export function integrityColor(score) {
  const s = Number(score)
  if (s <= 40) return '#dc2626' // red
  if (s <= 60) return '#f97316' // orange
  if (s <= 80) return '#eab308' // yellow
  return '#16a34a' // green
}

export function truncate(text, len = 60) {
  if (!text) return ''
  return text.length > len ? `${text.slice(0, len)}…` : text
}
