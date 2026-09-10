export function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        className="relative w-10 h-5.5 rounded-full transition-colors shrink-0"
        style={{ background: checked ? 'var(--accent)' : 'var(--line)', height: '22px' }}
      >
        <span
          className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
        />
      </span>
    </button>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-2 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="relative px-3.5 py-1.5 rounded-md text-sm font-medium capitalize transition-colors"
          style={
            value === opt.value
              ? { background: 'var(--accent)', color: '#fff' }
              : { color: 'var(--text-dim)' }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function SwatchPicker({ value, onChange, swatches }) {
  return (
    <div className="flex items-center gap-2.5">
      {Object.entries(swatches).map(([key, hex]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          title={key}
          className="h-7 w-7 rounded-full transition-transform hover:scale-110"
          style={{
            background: hex,
            boxShadow: value === key ? `0 0 0 2px var(--surface), 0 0 0 4px ${hex}` : 'none'
          }}
        />
      ))}
    </div>
  )
}
