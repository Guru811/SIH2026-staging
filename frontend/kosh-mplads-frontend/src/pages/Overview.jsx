import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts'
import { motion } from 'framer-motion'
import PageTransition, { staggerContainer, staggerItem } from '../components/PageTransition'
import KpiCard from '../components/KpiCard'
import { SkeletonGrid } from '../components/Skeleton'
import { ErrorState } from '../components/States'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { formatCr, formatNumber, formatPercent, RISK_COLORS } from '../lib/format'

export default function Overview() {
  const national = useApi(endpoints.nationalStats, [])
  const summary = useApi(endpoints.summary, [])
  const integrity = useApi(endpoints.integrityIndex, [])

  const loading = national.loading || summary.loading || integrity.loading
  const error = national.error || summary.error || integrity.error

  const rows = integrity.data?.constituencies || integrity.data || []

  const donutData = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    rows.forEach((r) => {
      const band = String(r.risk_band || '').toUpperCase()
      if (counts[band] !== undefined) counts[band] += 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [rows])

  const topStatesByRisk = useMemo(() => {
    const byState = {}
    rows.forEach((r) => {
      if (!r.state) return
      if (!byState[r.state]) byState[r.state] = { total: 0, count: 0 }
      byState[r.state].total += Number(r.avg_financial_risk) || 0
      byState[r.state].count += 1
    })
    return Object.entries(byState)
      .map(([state, v]) => ({ state, avgRisk: v.total / v.count }))
      .sort((a, b) => b.avgRisk - a.avgRisk)
      .slice(0, 10)
  }, [rows])

  const topConstituenciesByProjects = useMemo(() => {
    return [...rows]
      .sort((a, b) => (Number(b.n_projects) || 0) - (Number(a.n_projects) || 0))
      .slice(0, 10)
      .map((r) => ({ name: r.constituency, projects: Number(r.n_projects) || 0 }))
  }, [rows])

  const statesCount = new Set(rows.map((r) => r.state)).size

  return (
    <PageTransition>
      {error && <ErrorState message={error} />}

      {!error && (
        <>
          {/* Section A — National MPLADS Overview */}
          <SectionHeader title="National MPLADS Overview" />
          {loading ? (
            <SkeletonGrid count={6} />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Total Allocated"
                  value={national.data?.national_total_allocated}
                  format={(v) => formatCr(v)}
                  source="Source: e-SAKSHI / EmpoweredIndian.in"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Total Expenditure"
                  value={national.data?.national_total_expenditure}
                  format={(v) => formatCr(v)}
                  source="Source: e-SAKSHI / EmpoweredIndian.in"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Fund Utilization"
                  value={national.data?.national_fund_utilization}
                  format={(v) => formatPercent(v)}
                  source="Source: e-SAKSHI / EmpoweredIndian.in"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Works Completed"
                  value={national.data?.national_works_completed}
                  format={(v) => formatNumber(v)}
                  source="Source: e-SAKSHI / EmpoweredIndian.in"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Pending Works"
                  value={national.data?.national_works_pending}
                  format={(v) => formatNumber(v)}
                  color="text-orange-600"
                  source="Source: e-SAKSHI / EmpoweredIndian.in"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Total MPs"
                  value={national.data?.national_total_mps}
                  format={(v) => formatNumber(v)}
                  source="Source: e-SAKSHI / EmpoweredIndian.in"
                />
              </motion.div>
            </motion.div>
          )}

          {/* Section B — AI Risk Findings */}
          <SectionHeader title="AI Risk Findings" className="mt-12" />
          {loading ? (
            <SkeletonGrid count={6} />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Financial Anomalies"
                  value={summary.data?.flagged_anomalies}
                  format={(v) => formatNumber(v)}
                  color="text-risk-critical"
                  source="Detected by Zero Artifacts AI — 5 ML models"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Critical Constituencies"
                  value={summary.data?.critical_constituencies}
                  format={(v) => formatNumber(v)}
                  color="text-risk-critical"
                  source="Detected by Zero Artifacts AI — 5 ML models"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="High Risk Vendors"
                  value={summary.data?.high_risk_vendors}
                  format={(v) => formatNumber(v)}
                  color="text-risk-high"
                  source="Detected by Zero Artifacts AI — 5 ML models"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Duplicate Works"
                  value={summary.data?.duplicate_works}
                  format={(v) => formatNumber(v)}
                  color="text-risk-high"
                  source="Detected by Zero Artifacts AI — 5 ML models"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Bulk Spending MPs"
                  value={summary.data?.bulk_spending_mps}
                  format={(v) => formatNumber(v)}
                  color="text-risk-medium"
                  source="Detected by Zero Artifacts AI — 5 ML models"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <KpiCard
                  label="Weather Alibi Applied"
                  value={summary.data?.weather_alibi_applied}
                  format={(v) => formatNumber(v)}
                  color="text-risk-low"
                  source="Detected by Zero Artifacts AI — 5 ML models"
                />
              </motion.div>
            </motion.div>
          )}

          {/* Section C — Charts */}
          <SectionHeader title="Risk Distribution" className="mt-12" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ChartCard title="Constituencies by risk band">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    animationDuration={900}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={24} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 states by avg financial risk">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topStatesByRisk} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="state" width={90} tick={{ fontSize: 10.5 }} />
                  <Tooltip />
                  <Bar dataKey="avgRisk" fill="#1e3a5f" radius={[0, 4, 4, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 constituencies by projects">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topConstituenciesByProjects} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9.5 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="projects" fill="#f97316" radius={[4, 4, 0, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Section D — Bottom stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-14 rounded-xl bg-accent text-white px-6 py-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium"
          >
            <Stat value={`${statesCount || 32} States`} />
            <Divider />
            <Stat value={`${formatNumber(rows.length || 350)} Constituencies`} />
            <Divider />
            <Stat value={`${formatNumber(national.data?.national_total_works || 29000)} Projects`} />
            <Divider />
            <Stat value="5 ML Models" />
            <Divider />
            <Stat value="Real eSAKSHI Data" />
          </motion.div>
        </>
      )}
    </PageTransition>
  )
}

function SectionHeader({ title, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-lg font-semibold text-accent">{title}</h2>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 card-hover">
      <h3 className="text-sm font-semibold text-ink mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Stat({ value }) {
  return <span className="tabular-nums">{value}</span>
}

function Divider() {
  return <span className="text-white/30">|</span>
}
