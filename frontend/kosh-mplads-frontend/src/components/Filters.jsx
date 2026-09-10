export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full sm:w-72 rounded-lg border border-line px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-accent transition-colors ${className}`}
    />
  )
}

export function Select({ value, onChange, options, placeholder, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-line px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-accent transition-colors ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

export function RiskBandButtons({ value, onChange }) {
  const bands = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  const colors = {
    ALL: 'bg-accent text-white',
    CRITICAL: 'bg-risk-critical text-white',
    HIGH: 'bg-risk-high text-white',
    MEDIUM: 'bg-risk-medium text-white',
    LOW: 'bg-risk-low text-white'
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      {bands.map((b) => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
            value === b ? colors[b] + ' shadow-sm' : 'bg-surface2 text-dim hover:bg-surface2'
          }`}
        >
          {b}
        </button>
      ))}
    </div>
  )
}

export function SortableTh({ label, sortKey, activeKey, dir, onSort }) {
  const active = activeKey === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase tracking-wide cursor-pointer select-none hover:text-accent transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] transition-transform ${active ? 'text-accent' : 'text-dim'}`}>
          {active ? (dir === 1 ? '▲' : '▼') : '▲'}
        </span>
      </span>
    </th>
  )
}
