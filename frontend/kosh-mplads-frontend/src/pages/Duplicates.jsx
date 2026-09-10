import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import PageTransition, { staggerContainer, staggerItem } from '../components/PageTransition'
import { SkeletonGrid } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { Select } from '../components/Filters'
import Pagination from '../components/Pagination'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { formatCr, formatINR } from '../lib/format'

const PAGE_SIZE = 20

export default function Duplicates() {
  const { data, loading, error } = useApi(() => endpoints.duplicates(2000), [])
  const rows = data?.duplicates || data || []

  const [stateFilter, setStateFilter] = useState('')
  const [constituencyFilter, setConstituencyFilter] = useState('')
  const [similarity, setSimilarity] = useState(85)
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [stateFilter, constituencyFilter, similarity])

  const states = [...new Set(rows.map((r) => r.state).filter(Boolean))]
  const constituencies = [
    ...new Set(
      rows.filter((r) => !stateFilter || r.state === stateFilter).map((r) => r.constituency).filter(Boolean)
    )
  ]

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stateFilter && r.state !== stateFilter) return false
      if (constituencyFilter && r.constituency !== constituencyFilter) return false
      if ((r.max_similarity || 0) < similarity) return false
      return true
    })
  }, [rows, stateFilter, constituencyFilter, similarity])

  const totalAtRisk = filtered.reduce((sum, r) => sum + (Number(r.sanction_amount) || 0), 0)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-accent">Duplicate Works Review</h1>
        <p className="text-sm text-dim mt-1">Works with near-identical descriptions across records.</p>
      </div>

      {error && <ErrorState message={error} />}

      {!error && (
        <>
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-orange-50 border border-orange-200 text-orange-800 px-5 py-3.5 mb-6 font-medium text-sm"
            >
              {filtered.length.toLocaleString('en-IN')} potentially duplicate works detected — {formatCr(totalAtRisk)} at risk
            </motion.div>
          )}

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Select
              value={stateFilter}
              onChange={(v) => {
                setStateFilter(v)
                setConstituencyFilter('')
              }}
              options={states}
              placeholder="All states"
            />
            <Select
              value={constituencyFilter}
              onChange={setConstituencyFilter}
              options={constituencies}
              placeholder="All constituencies"
            />
            <div className="flex items-center gap-3 bg-surface2 rounded-lg px-4 py-2 border border-line">
              <span className="text-xs text-dim whitespace-nowrap">Similarity ≥ {similarity}%</span>
              <input
                type="range"
                min={85}
                max={100}
                value={similarity}
                onChange={(e) => setSimilarity(Number(e.target.value))}
                className="w-40" style={{ accentColor: 'var(--accent)' }}
              />
            </div>
          </div>

          {loading ? (
            <SkeletonGrid count={6} />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {pageRows.map((r, i) => (
                  <motion.div key={i} variants={staggerItem}>
                    <DuplicateCard row={r} />
                  </motion.div>
                ))}
              </motion.div>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </>
      )}
    </PageTransition>
  )
}

function DuplicateCard({ row }) {
  const isExact = row.max_similarity >= 100
  const isHighConf = row.max_similarity >= 97 && row.max_similarity < 100
  const borderColor = isExact ? 'border-l-risk-critical' : isHighConf ? 'border-l-risk-high' : 'border-l-line'
  const badgeClasses = isExact
    ? 'bg-red-100 text-red-700'
    : isHighConf
    ? 'bg-orange-100 text-orange-700'
    : 'bg-surface2 text-dim'
  const badgeLabel = isExact ? 'Exact Match' : isHighConf ? 'High Confidence' : `${row.max_similarity}% match`

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`rounded-xl border border-line border-l-4 ${borderColor} bg-surface p-4 card-hover flex items-center gap-4`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate" title={row.work}>{row.work}</p>
        <p className="text-xs text-dim mt-1">{row.constituency}, {row.state}</p>
        <p className="text-xs text-dim">{row.work_category}</p>
        <p className="text-sm font-semibold text-accent mt-1">{formatINR(row.sanction_amount)}</p>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeClasses}`}>
          {row.max_similarity}%
        </span>
        <span className="text-[10px] text-dim">{badgeLabel}</span>
      </div>
      <div className="text-right shrink-0 max-w-[120px]">
        <p className="text-[10px] text-dim uppercase">Matched IDA</p>
        <p className="text-xs text-dim truncate" title={row.most_similar_ida}>{row.most_similar_ida}</p>
      </div>
    </motion.div>
  )
}
