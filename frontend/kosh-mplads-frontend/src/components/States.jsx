import { motion } from 'framer-motion'

export function ErrorState({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <p className="text-red-700 font-medium">
        {message || 'Unable to connect to backend — ensure uvicorn is running on port 8000'}
      </p>
    </motion.div>
  )
}

export function EmptyState({ message = 'No data found for selected filters' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-dashed border-line bg-surface2 px-6 py-14 text-center"
    >
      <p className="text-dim">{message}</p>
    </motion.div>
  )
}
