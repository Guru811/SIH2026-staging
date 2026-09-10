import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8"
    >
      {children}
    </motion.div>
  )
}

// Shared stagger container/item for animating table rows & card grids in on load
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.035 } }
}

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } }
}
