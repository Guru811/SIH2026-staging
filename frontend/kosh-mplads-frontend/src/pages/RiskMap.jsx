import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { SkeletonCard } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { RiskBadge } from '../components/Badges'
import { SearchInput, SortableTh } from '../components/Filters'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { integrityColor, integrityBand, formatNumber } from '../lib/format'
import { getConstituencyCoords } from '../lib/coords'

const INDIA_TOPO_URL =
  'https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@2884453/topojson/india.json'

export default function RiskMap() {
  const { data, loading, error } = useApi(endpoints.integrityIndex, [])
  const rows = useMemo(() => (data?.constituencies || data || []).map((r) => ({
    ...r,
    risk_band: r.risk_band || integrityBand(r.integrity_score)
  })), [data])

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-accent">Constituency Integrity Map</h1>
        <p className="text-sm text-dim mt-1">
          Each marker is a constituency, coloured and scored by its integrity index.
        </p>
      </div>

      {error && <ErrorState message={error} />}

      {!error && (
        <>
          <div className="rounded-xl border border-line bg-surface p-4 card-hover mb-8">
            {loading ? <SkeletonCard className="h-[420px]" /> : <IndiaMap rows={rows} />}
          </div>

          <RankedTable rows={rows} loading={loading} />
        </>
      )}
    </PageTransition>
  )
}

function IndiaMap({ rows }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const navigate = useNavigate()
  const [tooltip, setTooltip] = useState(null) // {x, y, row}

  useEffect(() => {
    let cancelled = false
    const width = wrapRef.current?.clientWidth || 700
    const height = 460

    d3.json(INDIA_TOPO_URL).then((topo) => {
      if (cancelled || !topo) return
      const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`)
      svg.selectAll('*').remove()

      const objectKey = Object.keys(topo.objects)[0]
      const geo = topojson.feature(topo, topo.objects[objectKey])
      const projection = d3.geoMercator().fitSize([width, height], geo)
      const path = d3.geoPath().projection(projection)

      svg
        .append('g')
        .selectAll('path')
        .data(geo.features)
        .join('path')
        .attr('d', path)
        .attr('fill', '#f3f5f9')
        .attr('stroke', '#dbe1ee')
        .attr('stroke-width', 0.7)

      const markers = rows
        .map((r) => {
          const coords = getConstituencyCoords(r.constituency, r.state)
          if (!coords) return null
          const [x, y] = projection(coords) || []
          if (x == null) return null
          return { ...r, x, y }
        })
        .filter(Boolean)

      const g = svg.append('g')

      const circles = g
        .selectAll('circle')
        .data(markers)
        .join('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', 0)
        .attr('fill', (d) => integrityColor(d.integrity_score))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.2)
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')

      // staggered entrance animation
      circles
        .transition()
        .delay((_, i) => i * 4)
        .duration(400)
        .ease(d3.easeBackOut)
        .attr('r', 7)

      circles
        .on('mouseenter', function (event, d) {
          d3.select(this).transition().duration(150).attr('r', 11)
          const rect = wrapRef.current.getBoundingClientRect()
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            row: d
          })
        })
        .on('mousemove', function (event) {
          const rect = wrapRef.current.getBoundingClientRect()
          setTooltip((t) => (t ? { ...t, x: event.clientX - rect.left, y: event.clientY - rect.top } : t))
        })
        .on('mouseleave', function () {
          d3.select(this).transition().duration(150).attr('r', 7)
          setTooltip(null)
        })
        .on('click', (_, d) => {
          navigate(`/projects?constituency=${encodeURIComponent(d.constituency)}`)
        })

      g.selectAll('text')
        .data(markers)
        .join('text')
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', 6.5)
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .attr('pointer-events', 'none')
        .text((d) => Math.round(d.integrity_score))
    })

    return () => {
      cancelled = true
    }
  }, [rows, navigate])

  return (
    <div ref={wrapRef} className="relative">
      <svg ref={svgRef} className="w-full" style={{ maxHeight: 460 }} />
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
            className="absolute z-10 pointer-events-none rounded-lg bg-accent text-white text-xs px-3.5 py-3 shadow-xl w-56"
          >
            <p className="font-semibold text-sm mb-1">{tooltip.row.constituency}</p>
            <Row label="State" value={tooltip.row.state} />
            <Row label="Integrity score" value={Math.round(tooltip.row.integrity_score)} />
            <Row label="Risk band" value={tooltip.row.risk_band} />
            <Row label="Projects" value={tooltip.row.n_projects} />
            <Row label="Financial risk" value={tooltip.row.avg_financial_risk} />
            <Row label="Delay risk" value={tooltip.row.avg_delay_risk} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-4 mt-3 text-xs text-dim flex-wrap">
        <Legend color="#dc2626" label="0–40 Critical" />
        <Legend color="#f97316" label="41–60 High" />
        <Legend color="#eab308" label="61–80 Medium" />
        <Legend color="#16a34a" label="81–100 Low" />
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-white/80">
      <span>{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function RankedTable({ rows, loading }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('integrity_score')
  const [dir, setDir] = useState(1) // ascending = worst first, matches spec default

  const filtered = useMemo(() => {
    let list = rows
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) => r.constituency?.toLowerCase().includes(q) || r.state?.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => (Number(a[sortKey]) - Number(b[sortKey])) * dir)
  }, [rows, search, sortKey, dir])

  function onSort(key) {
    if (key === sortKey) setDir((d) => -d)
    else {
      setSortKey(key)
      setDir(1)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-accent">Ranked constituencies</h2>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or state…" />
      </div>

      {loading ? (
        <SkeletonCard className="h-64" />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Constituency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">State</th>
                <SortableTh label="Integrity Score" sortKey="integrity_score" activeKey={sortKey} dir={dir} onSort={onSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Risk Band</th>
                <SortableTh label="Projects" sortKey="n_projects" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortableTh label="Financial Risk" sortKey="avg_financial_risk" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortableTh label="Delay Risk" sortKey="avg_delay_risk" activeKey={sortKey} dir={dir} onSort={onSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {filtered.map((r, i) => (
                <tr
                  key={r.constituency + i}
                  onClick={() => navigate(`/projects?constituency=${encodeURIComponent(r.constituency)}`)}
                  className="hover:bg-surface2 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-dim tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-ink">{r.constituency}</td>
                  <td className="px-4 py-3 text-sm text-dim">{r.state}</td>
                  <td className="px-4 py-3 text-sm font-semibold tabular-nums" style={{ color: integrityColor(r.integrity_score) }}>
                    {Math.round(r.integrity_score)}
                  </td>
                  <td className="px-4 py-3"><RiskBadge band={r.risk_band} /></td>
                  <td className="px-4 py-3 text-sm tabular-nums">{formatNumber(r.n_projects)}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{Math.round(r.avg_financial_risk)}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{Math.round(r.avg_delay_risk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
