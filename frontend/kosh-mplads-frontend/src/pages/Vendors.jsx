import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { SkeletonCard, SkeletonRow } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { CollusionDot } from '../components/Badges'
import { SearchInput, SortableTh } from '../components/Filters'
import { useApi } from '../hooks/useApi'
import { endpoints } from '../lib/api'
import { formatCr, formatNumber } from '../lib/format'

export default function Vendors() {
  const graph = useApi(endpoints.vendorGraph, [])
  const risks = useApi(() => endpoints.vendorRisks(200), [])

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-accent">Vendor Intelligence</h1>
        <p className="text-sm text-dim mt-1">Contractor–MP collusion network and vendor risk scoring.</p>
      </div>

      {(graph.error || risks.error) && <ErrorState message={graph.error || risks.error} />}

      {!graph.error && !risks.error && (
        <>
          <div className="rounded-xl border border-line bg-surface p-4 card-hover mb-3">
            {graph.loading ? <SkeletonCard className="h-[420px]" /> : <CollusionGraph data={graph.data} />}
          </div>
          <p className="text-xs text-dim mb-10">Showing vendors with 2+ collusion flags only</p>

          <VendorTable data={risks.data} loading={risks.loading} />
        </>
      )}
    </PageTransition>
  )
}

function CollusionGraph({ data }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    const nodesRaw = data?.nodes || []
    const linksRaw = data?.links || []
    if (!nodesRaw.length) return

    const width = wrapRef.current?.clientWidth || 700
    const height = 420

    const mpIds = new Set(linksRaw.map((l) => l.target))
    const nodes = nodesRaw.map((n) => ({
      ...n,
      type: mpIds.has(n.id) && !linksRaw.some((l) => l.source === n.id) ? 'mp' : 'vendor'
    }))
    // recompute properly: a node is an MP if it only ever appears as a link target
    const sourceIds = new Set(linksRaw.map((l) => l.source))
    nodes.forEach((n) => {
      n.type = sourceIds.has(n.id) ? 'vendor' : 'mp'
    })

    const links = linksRaw.map((l) => ({ ...l }))
    const weightScale = d3.scaleLinear()
      .domain([0, d3.max(links, (d) => d.weight) || 1])
      .range([1, 8])

    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`)
    svg.selectAll('*').remove()

    const sim = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(18))

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', (d) => weightScale(d.weight))
      .attr('opacity', 0)

    link.transition().duration(500).attr('opacity', 0.7)

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 0)
      .attr('fill', (d) => (d.type === 'mp' ? '#16a34a' : '#2563eb'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'grab')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    node
      .transition()
      .delay((_, i) => i * 6)
      .duration(400)
      .ease(d3.easeBackOut)
      .attr('r', (d) => (d.type === 'mp' ? 9 : 7))

    node
      .on('mouseenter', function (event, d) {
        const connections = links.filter((l) => l.source.id === d.id || l.target.id === d.id).length
        const disbursed = d3.sum(
          links.filter((l) => l.source.id === d.id || l.target.id === d.id),
          (l) => l.amount || 0
        )
        const rect = wrapRef.current.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          name: d.id,
          type: d.type,
          connections,
          disbursed
        })
      })
      .on('mousemove', (event) => {
        const rect = wrapRef.current.getBoundingClientRect()
        setTooltip((t) => (t ? { ...t, x: event.clientX - rect.left, y: event.clientY - rect.top } : t))
      })
      .on('mouseleave', () => setTooltip(null))

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
    })

    return () => sim.stop()
  }, [data])

  return (
    <div ref={wrapRef} className="relative">
      <svg ref={svgRef} className="w-full" style={{ maxHeight: 420 }} />
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
            className="absolute z-10 pointer-events-none rounded-lg bg-accent text-white text-xs px-3.5 py-3 shadow-xl w-52"
          >
            <p className="font-semibold text-sm mb-1">{tooltip.name}</p>
            <p className="text-white/70">{tooltip.type === 'mp' ? 'Member of Parliament' : 'Vendor'}</p>
            <div className="flex justify-between mt-1">
              <span className="text-white/70">Connections</span>
              <span>{tooltip.connections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Disbursed</span>
              <span>{formatCr(tooltip.disbursed)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-4 mt-3 text-xs text-dim">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Vendor</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />MP</span>
      </div>
    </div>
  )
}

function VendorTable({ data, loading }) {
  const rows = data?.vendors || data || []
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('total_disbursed')
  const [dir, setDir] = useState(-1)

  const filtered = useMemo(() => {
    let list = rows
    if (search) list = list.filter((r) => r.vendor_name?.toLowerCase().includes(search.toLowerCase()))
    return [...list].sort((a, b) => (Number(a[sortKey]) - Number(b[sortKey])) * dir)
  }, [rows, search, sortKey, dir])

  function onSort(key) {
    if (key === sortKey) setDir((d) => -d)
    else {
      setSortKey(key)
      setDir(-1)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-accent">Vendor risk table</h2>
        <SearchInput value={search} onChange={setSearch} placeholder="Search vendor name…" />
      </div>
      {!loading && filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Vendor Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Constituencies Served</th>
                <SortableTh label="Total Disbursed" sortKey="total_disbursed" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortableTh label="Collusion Flags" sortKey="collusion_flags" activeKey={sortKey} dir={dir} onSort={onSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-dim uppercase">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                : filtered.map((v, i) => (
                    <tr key={v.vendor_name + i} className="hover:bg-surface2 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-ink">{v.vendor_name}</td>
                      <td className="px-4 py-3 text-sm text-dim">{formatNumber(v.constituencies_served)}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">{formatCr(v.total_disbursed)}</td>
                      <td className="px-4 py-3 text-sm"><CollusionDot count={v.collusion_flags || 0} /></td>
                      <td className="px-4 py-3 text-sm font-medium">{v.risk_level}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
