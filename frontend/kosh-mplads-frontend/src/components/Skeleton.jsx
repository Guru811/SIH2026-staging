export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-5 overflow-hidden relative ${className}`}
    >
      <div className="h-3 w-24 rounded bg-surface2 mb-3 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="h-7 w-32 rounded bg-surface2 relative overflow-hidden">
        <Shimmer />
      </div>
    </div>
  )
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 rounded bg-surface2 relative overflow-hidden">
            <Shimmer />
          </div>
        </td>
      ))}
    </tr>
  )
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

function Shimmer() {
  return (
    <span
      className="absolute inset-0 animate-shimmer"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.8) 50%, rgba(255,255,255,0) 100%)',
        backgroundSize: '500px 100%'
      }}
    />
  )
}
