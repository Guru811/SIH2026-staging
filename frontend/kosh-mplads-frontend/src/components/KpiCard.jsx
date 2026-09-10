import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { motion } from 'framer-motion'

/**
 * value: raw numeric value to count up to
 * format: function(number) -> display string, applied every tick so
 *         currency/percent formatting animates smoothly too
 */
export default function KpiCard({ label, value, format = (v) => v, color = 'text-accent', source }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const counter = { val: 0 }
    const target = Number(value) || 0
    const tween = gsap.to(counter, {
      val: target,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = format(counter.val)
      }
    })
    return () => tween.kill()
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="rounded-xl border border-line bg-surface p-5 shadow-sm hover:shadow-lg transition-shadow"
    >
      <p className="text-xs font-medium text-dim uppercase tracking-wide mb-1">{label}</p>
      <p ref={ref} className={`text-2xl font-bold tabular-nums ${color}`}>
        {format(0)}
      </p>
      {source && <p className="text-[11px] text-dim mt-2">{source}</p>}
    </motion.div>
  )
}
