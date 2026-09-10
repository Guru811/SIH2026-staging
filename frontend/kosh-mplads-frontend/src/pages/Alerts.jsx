import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition, { staggerContainer, staggerItem } from '../components/PageTransition'
import { SkeletonGrid } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { formatCr, riskColor } from '../lib/format'
import { useTheme } from '../context/ThemeContext'

export default function Alerts() {
  const { notifyHigh, notifyMedium } = useTheme()

  const integrity = useApi(endpoints.integrityIndex, [])
  const spending = useApi(() => endpoints.spendingPatterns(500), [])
  const duplicates = useApi(() => endpoints.duplicates(2000), [])
  const vendors = useApi(() => endpoints.vendorRisks(200), [])

  const loading = integrity.loading || spending.loading || duplicates.loading || vendors.loading
  const error = integrity.error || spending.error || duplicates.error || vendors.error

  const alerts = useMemo(() => {
    const items = []

    const critical = (integrity.data?.constituencies || integrity.data || []).filter(
      (r) => String(r.risk_band).toUpperCase() === 'CRITICAL'
    )
    critical.slice(0, 25).forEach((r) =>
      items.push({
        id: `ci-${r.constituency}`,
        severity: 'CRITICAL',
        title: `${r.constituency} flagged as a critical-integrity constituency`,
        detail: `Integrity score ${Math.round(r.integrity_score)}/100 across ${r.n_projects} projects.`,
        to: `/projects?constituency=${encodeURIComponent(r.constituency)}`
      })
    )

    const rushed = (spending.data?.mps || spending.data || []).filter((r) => r.march_rush_flag)
    rushed.slice(0, 25).forEach((r) =>
      items.push({
        id: `mp-${r.mp}`,
        severity: 'HIGH',
        title: `${r.mp} dumped funds at year-end`,
        detail: `${Math.round((r.march_spending_ratio || 0) * 100)}% of annual expenditure spent in March.`,
        to: '/mps'
      })
    )

    const dupRows = (duplicates.data?.duplicates || duplicates.data || []).filter((r) => r.max_similarity >= 97)
    if (dupRows.length) {
      const atRisk = dupRows.reduce((s, r) => s + (Number(r.sanction_amount) || 0), 0)
      items.push({
        id: 'dup-cluster',
        severity: dupRows.some((r) => r.max_similarity >= 100) ? 'CRITICAL' : 'HIGH',
        title: `${dupRows.length} high-confidence duplicate works detected`,
        detail: `${formatCr(atRisk)} in sanctioned value is potentially double-counted.`,
        to: '/duplicates'
      })
    }

    const collusive = (vendors.data?.vendors || vendors.data || []).filter((r) => (r.collusion_flags || 0) >= 2)
    collusive.slice(0, 25).forEach((r) =>
      items.push({
        id: `v-${r.vendor_name}`,
        severity: (r.collusion_flags || 0) >= 3 ? 'CRITICAL' : 'HIGH',
        title: `${r.vendor_name} shows repeated collusion signals`,
        detail: `${r.collusion_flags} collusion flags across ${r.constituencies_served} constituencies.`,
        to: '/vendors'
      })
    )

    return items
      .filter((a) => (a.severity === 'MEDIUM' ? notifyMedium : notifyHigh))
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
  }, [integrity.data, spending.data, duplicates.data, vendors.data, notifyHigh, notifyMedium])

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-bold font-display">Alerts</h1>
        <p className="text-sm text-dim mt-1">
          A unified feed of everything the financial, delay, duplicate, and vendor-collusion layers have flagged.
        </p>
      </div>

      {error && <ErrorState message={error} />}

      {!error &&
        (loading ? (
          <SkeletonGrid count={6} />
        ) : alerts.length === 0 ? (
          <EmptyState message="No alerts match your current notification settings" />
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {alerts.map((a) => (
              <motion.div key={a.id} variants={staggerItem}>
                <Link
                  to={a.to}
                  className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 card-hover"
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 rounded-full shrink-0 animate-pulseGlow"
                    style={{ background: riskColor(a.severity) }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="text-xs text-dim mt-0.5">{a.detail}</p>
                  </div>
                  <span
                    className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: riskColor(a.severity), background: `${riskColor(a.severity)}1a` }}
                  >
                    {a.severity}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ))}
    </PageTransition>
  )
}

function severityRank(s) {
  return { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 }[s] || 0
}
