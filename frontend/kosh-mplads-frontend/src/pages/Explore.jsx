import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition, { staggerContainer, staggerItem } from '../components/PageTransition'
import { SkeletonGrid, SkeletonRow } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { RiskBadge } from '../components/Badges'
import { SearchInput } from '../components/Filters'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { integrityColor, integrityBand } from '../lib/format'

export default function Explore() {
  const navigate = useNavigate()
  const statesRes = useApi(endpoints.states, [])
  const allStates = statesRes.data?.states || statesRes.data || []

  const [activeState, setActiveState] = useState('')
  const [tab, setTab] = useState('constituencies')
  const [search, setSearch] = useState('')

  const constituenciesRes = useApi(
    () => (activeState ? endpoints.constituencies(activeState) : Promise.resolve([])),
    [activeState]
  )
  const mpsRes = useApi(() => (activeState ? endpoints.mps(activeState) : Promise.resolve([])), [activeState])
  const integrityRes = useApi(endpoints.integrityIndex, [])
  const integrityRows = integrityRes.data?.constituencies || integrityRes.data || []
  const integrityByName = useMemo(() => {
    const map = {}
    integrityRows.forEach((r) => (map[r.constituency] = r))
    return map
  }, [integrityRows])

  const constituencies = (constituenciesRes.data?.constituencies || constituenciesRes.data || []).filter(
    (c) => !search || (c.constituency || c.name || '').toLowerCase().includes(search.toLowerCase())
  )
  const mps = (mpsRes.data?.mps || mpsRes.data || []).filter(
    (m) => !search || (m.mp || m.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-accent">Browse All Data</h1>
        <p className="text-sm text-dim mt-1">Pick a state to explore its constituencies and MPs.</p>
      </div>

      {statesRes.error && <ErrorState message={statesRes.error} />}

      {!statesRes.error && (
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="rounded-xl border border-line bg-surface p-2 h-fit md:sticky md:top-20 max-h-[70vh] overflow-y-auto">
            {statesRes.loading ? (
              <SkeletonGrid count={4} />
            ) : (
              allStates.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveState(s === activeState ? '' : s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors relative ${
                    activeState === s ? 'bg-accent text-white font-medium' : 'text-dim hover:bg-surface2'
                  }`}
                >
                  {s}
                  {activeState === s && (
                    <motion.span
                      layoutId="explore-state-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-surface rounded-r"
                    />
                  )}
                </button>
              ))
            )}
          </aside>

          {/* Main */}
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex rounded-lg border border-line p-1 bg-surface2 w-fit">
                {['constituencies', 'mps'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                      tab === t ? 'text-white' : 'text-dim'
                    }`}
                  >
                    {tab === t && (
                      <motion.span
                        layoutId="explore-tab-bg"
                        className="absolute inset-0 bg-accent rounded-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{t === 'mps' ? 'MPs' : 'Constituencies'}</span>
                  </button>
                ))}
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder="Search live…" />
            </div>

            {!activeState ? (
              <EmptyState message="Select a state from the sidebar to browse its data" />
            ) : (
              <AnimatePresence mode="wait">
                {tab === 'constituencies' ? (
                  <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {constituenciesRes.loading ? (
                      <SkeletonGrid count={6} />
                    ) : constituencies.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                      >
                        {constituencies.map((c, i) => {
                          const name = c.constituency || c.name
                          const info = integrityByName[name]
                          const score = info?.integrity_score
                          return (
                            <motion.div
                              key={name + i}
                              variants={staggerItem}
                              whileHover={{ y: -3 }}
                              onClick={() => navigate(`/projects?constituency=${encodeURIComponent(name)}`)}
                              className="rounded-xl border border-line bg-surface p-4 card-hover cursor-pointer"
                            >
                              <p className="font-medium text-ink">{name}</p>
                              <p className="text-xs text-dim mb-2">{activeState}</p>
                              {info && (
                                <div className="flex items-center justify-between">
                                  <RiskBadge band={info.risk_band || integrityBand(score)} />
                                  <span
                                    className="text-sm font-bold tabular-nums"
                                    style={{ color: integrityColor(score) }}
                                  >
                                    {Math.round(score)}
                                  </span>
                                </div>
                              )}
                              <p className="text-xs text-dim mt-2">
                                {info?.n_projects != null ? `${info.n_projects} projects` : c.n_projects != null ? `${c.n_projects} projects` : ''}
                              </p>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {mpsRes.loading ? (
                      <div className="rounded-xl border border-line overflow-hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <table key={i} className="w-full"><tbody><SkeletonRow cols={4} /></tbody></table>
                        ))}
                      </div>
                    ) : mps.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="min-w-full divide-y divide-line">
                          <thead className="bg-surface2">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">MP Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Constituency</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">State</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">House</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line bg-surface">
                            {mps.map((m, i) => (
                              <tr
                                key={(m.mp || m.name) + i}
                                onClick={() =>
                                  navigate(`/projects?constituency=${encodeURIComponent(m.constituency)}`)
                                }
                                className="hover:bg-surface2 cursor-pointer transition-colors"
                              >
                                <td className="px-4 py-3 text-sm font-medium text-ink">{m.mp || m.name}</td>
                                <td className="px-4 py-3 text-sm text-dim">{m.constituency}</td>
                                <td className="px-4 py-3 text-sm text-dim">{activeState}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      m.house === 'Rajya Sabha'
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {m.house || 'Lok Sabha'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  )
}
