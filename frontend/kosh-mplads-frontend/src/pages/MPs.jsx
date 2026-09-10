import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { SkeletonCard, SkeletonRow } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { SearchInput, Select } from '../components/Filters'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { formatPercent, formatCr } from '../lib/format'

export default function MPs() {
  const { data, loading, error } = useApi(() => endpoints.spendingPatterns(500), [])
  const rows = data?.mps || data || []

  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')

  const filtered = useMemo(() => {
    let list = rows
    if (stateFilter) list = list.filter((r) => r.state === stateFilter)
    if (search) list = list.filter((r) => r.mp?.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [rows, stateFilter, search])

  const flaggedCount = rows.filter((r) => r.march_rush_flag).length
  const states = [...new Set(rows.map((r) => r.state).filter(Boolean))]

  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (b.march_spending_ratio || 0) - (a.march_spending_ratio || 0))
        .slice(0, 20)
        .map((r) => ({
          mp: r.mp,
          march: Math.round((r.march_spending_ratio || 0) * 100),
          rest: 100 - Math.round((r.march_spending_ratio || 0) * 100)
        })),
    [rows]
  )

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-accent">MP Spending Patterns</h1>
        <p className="text-sm text-dim mt-1">Year-end fund-dumping and bulk-spending behaviour.</p>
      </div>

      {error && <ErrorState message={error} />}

      {!error && (
        <>
          {!loading && flaggedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-5 py-3.5 mb-6 font-medium text-sm"
            >
              ⚠️ {flaggedCount} MPs flagged for year-end fund dumping — more than 60% of annual
              expenditure in March
            </motion.div>
          )}

          <div className="rounded-xl border border-line bg-surface p-4 card-hover mb-8">
            <h3 className="text-sm font-semibold text-ink mb-3">March spending ratio (top 20)</h3>
            {loading ? (
              <SkeletonCard className="h-80" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 26)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="mp" width={130} tick={{ fontSize: 10.5 }} />
                  <Tooltip formatter={(v, name) => [`${v}%`, name === 'march' ? 'March' : 'Rest of year']} />
                  <Bar dataKey="march" stackId="a" fill="#dc2626" radius={[4, 0, 0, 4]} animationDuration={800} />
                  <Bar dataKey="rest" stackId="a" fill="#1e3a5f" radius={[0, 4, 4, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-accent">MP risk table</h2>
            <div className="flex gap-3 flex-wrap">
              <SearchInput value={search} onChange={setSearch} placeholder="Search MP name…" />
              <Select value={stateFilter} onChange={setStateFilter} options={states} placeholder="All states" />
            </div>
          </div>

          {!loading && filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-surface2">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">MP Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Constituency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">State</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">March Spending %</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Bulk Flag</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                    : filtered.map((r, i) => (
                        <tr key={r.mp + i} className="hover:bg-surface2 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{r.mp}</td>
                          <td className="px-4 py-3 text-sm text-dim">{r.constituency}</td>
                          <td className="px-4 py-3 text-sm text-dim">{r.state}</td>
                          <td className="px-4 py-3 text-sm tabular-nums">
                            {formatPercent((r.march_spending_ratio || 0) * 100)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {r.bulk_spending_flag ? (
                              <span className="text-risk-critical font-semibold">YES</span>
                            ) : (
                              <span className="text-dim">—</span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 text-sm font-semibold tabular-nums"
                            style={{ color: riskScoreColor(r.spending_risk_score) }}
                          >
                            {Math.round(r.spending_risk_score || 0)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PageTransition>
  )
}

function riskScoreColor(score) {
  const s = Number(score) || 0
  if (s >= 75) return '#dc2626'
  if (s >= 50) return '#f97316'
  if (s >= 25) return '#d97706'
  return '#16a34a'
}
