import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { SkeletonRow } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { RiskBadge, FlagPill } from '../components/Badges'
import { SearchInput, Select, RiskBandButtons, SortableTh } from '../components/Filters'
import Pagination from '../components/Pagination'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { formatINR, truncate, formatNumber } from '../lib/format'

const PAGE_SIZE = 50

export default function Projects() {
  const [searchParams] = useSearchParams()
  const constituency = searchParams.get('constituency')

  const states = useApi(endpoints.states, [])
  const projects = useApi(
    () => (constituency ? endpoints.projectsByConstituency(constituency) : endpoints.projectRisks(500)),
    [constituency]
  )

  const allRows = projects.data?.projects || projects.data || []

  // category medians, used to explain "cost is Nx the category median"
  const categoryMedians = useMemo(() => median_by_category(allRows), [allRows])

  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [band, setBand] = useState('ALL')
  const [sortKey, setSortKey] = useState('composite_risk_score')
  const [dir, setDir] = useState(-1)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => setPage(1), [search, stateFilter, band, constituency])

  const filtered = useMemo(() => {
    let list = allRows
    if (constituency) list = list.filter((r) => r.constituency === constituency)
    if (stateFilter) list = list.filter((r) => r.state === stateFilter)
    if (band !== 'ALL') list = list.filter((r) => String(r.risk_band).toUpperCase() === band)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.work_description?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => (Number(a[sortKey]) - Number(b[sortKey])) * dir)
  }, [allRows, constituency, stateFilter, band, search, sortKey, dir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function onSort(key) {
    if (key === sortKey) setDir((d) => -d)
    else {
      setSortKey(key)
      setDir(-1)
    }
  }

  return (
    <PageTransition>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-accent">Project Risk Register</h1>
          <p className="text-sm text-dim mt-1">
            {constituency ? `Filtered to ${constituency}` : 'All flagged projects across constituencies'}
          </p>
        </div>
        <RiskBandButtons value={band} onChange={setBand} />
      </div>

      {projects.error && <ErrorState message={projects.error} />}

      {!projects.error && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by work description…" />
            <Select
              value={stateFilter}
              onChange={setStateFilter}
              options={states.data?.states || states.data || []}
              placeholder="All states"
            />
          </div>

          {!projects.loading && filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-surface2">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Work ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Category</th>
                    <SortableTh label="Sanctioned" sortKey="sanction_amount" activeKey={sortKey} dir={dir} onSort={onSort} />
                    <SortableTh label="Risk Score" sortKey="composite_risk_score" activeKey={sortKey} dir={dir} onSort={onSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Risk Band</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Flagged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {projects.loading &&
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}

                  {!projects.loading &&
                    pageRows.map((p) => {
                      const id = p.work_id || p.id
                      const isOpen = expandedId === id
                      return (
                        <ProjectRow
                          key={id}
                          p={p}
                          isOpen={isOpen}
                          onToggle={() => setExpandedId(isOpen ? null : id)}
                          categoryMedian={categoryMedians[p.category || p.work_category]}
                        />
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </PageTransition>
  )
}

function ProjectRow({ p, isOpen, onToggle, categoryMedian }) {
  const id = p.work_id || p.id
  const desc = p.work_description || p.description || ''
  const financial = p.financial_risk_score
  const delay = p.delay_risk_score
  const similarity = p.max_similarity
  const status = p.work_status
  const daysSince = p.days_since_sanction
  const weatherAlibi = p.weather_alibi_applied || p.weather_alibi
  const sanctioned = p.sanction_amount || p.sanctioned_amount

  const ratio = categoryMedian ? (Number(sanctioned) / categoryMedian).toFixed(1) : null

  return (
    <>
      <tr onClick={onToggle} className="hover:bg-surface2 cursor-pointer transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-accent">{id}</td>
        <td className="px-4 py-3 text-sm text-ink max-w-xs" title={desc}>
          {truncate(desc, 55)}
        </td>
        <td className="px-4 py-3 text-sm text-dim">{p.category || p.work_category}</td>
        <td className="px-4 py-3 text-sm tabular-nums">{formatINR(sanctioned)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 w-32">
            <span className="text-sm font-semibold tabular-nums w-8">{Math.round(p.composite_risk_score || 0)}</span>
            <div className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${p.composite_risk_score || 0}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: bandColor(p.risk_band) }}
              />
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><RiskBadge band={p.risk_band} /></td>
        <td className="px-4 py-3">
          <FlagPill label="Financial" active={!!p.financial_flag || financial >= 60} />
          <FlagPill label="Delay" active={!!p.delay_flag || delay >= 60} />
          <FlagPill label="Duplicate" active={!!p.duplicate_flag || similarity >= 85} />
        </td>
      </tr>
      <AnimatePresence initial={false}>
        {isOpen && (
          <tr>
            <td colSpan={7} className="p-0 bg-surface2">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <Stat label="Financial risk score" value={financial != null ? `${financial}/100` : '—'} />
                  <Stat label="Delay risk score" value={delay != null ? `${delay}/100` : '—'} />
                  <Stat label="Similarity score" value={similarity != null ? `${similarity}%` : '—'} />
                  <Stat label="Work status" value={status || '—'} />
                  <Stat label="Days since sanction" value={daysSince != null ? formatNumber(daysSince) : '—'} />
                </div>
                <div className="px-5 pb-5">
                  <p className="text-xs font-semibold text-dim uppercase tracking-wide mb-2">
                    Why this project is flagged
                  </p>
                  <ul className="space-y-1.5 text-sm text-ink">
                    {financial != null && (
                      <li>
                        • Financial anomaly score: <span className="font-semibold">{financial}/100</span>
                        {ratio ? ` — cost is ${ratio}x the category median` : ''}
                      </li>
                    )}
                    {delay != null && (
                      <li>
                        • Delay risk: <span className="font-semibold">{delay}/100</span>
                        {daysSince != null
                          ? ` — sanctioned ${formatNumber(daysSince)} days ago, still at ${status || 'an incomplete stage'}`
                          : ''}
                      </li>
                    )}
                    <li>
                      •{' '}
                      {weatherAlibi
                        ? 'Weather alibi applied — a recorded extreme weather event partially explains the delay'
                        : 'No weather alibi — no extreme events recorded in this district'}
                    </li>
                    {similarity != null && similarity >= 85 && (
                      <li>
                        • Duplicate check: <span className="font-semibold">{similarity}%</span> similar to another
                        sanctioned work
                      </li>
                    )}
                  </ul>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-dim uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-ink">{value}</p>
    </div>
  )
}

function bandColor(band) {
  const key = String(band || '').toUpperCase()
  return { CRITICAL: '#dc2626', HIGH: '#f97316', MEDIUM: '#d97706', LOW: '#16a34a' }[key] || '#6b7280'
}

// Computes median sanctioned amount per work category, so the drill-down can say
// "cost is Nx the category median" using data actually present in the dataset.
function median_by_category(rows) {
  const byCategory = {}
  rows.forEach((r) => {
    const cat = r.category || r.work_category
    const amt = Number(r.sanction_amount || r.sanctioned_amount)
    if (!cat || !amt) return
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(amt)
  })
  const medians = {}
  Object.entries(byCategory).forEach(([cat, list]) => {
    const sorted = [...list].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    medians[cat] = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  })
  return medians
}
