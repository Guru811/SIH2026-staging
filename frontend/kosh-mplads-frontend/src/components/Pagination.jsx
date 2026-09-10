export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border border-line text-sm disabled:opacity-40 hover:bg-surface2 transition-colors active:scale-95"
      >
        Prev
      </button>
      <span className="text-sm text-dim tabular-nums">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg border border-line text-sm disabled:opacity-40 hover:bg-surface2 transition-colors active:scale-95"
      >
        Next
      </button>
    </div>
  )
}
