'use client'

import { motion } from 'framer-motion'

interface ProgressCueProps {
  completeness: number
}

export default function ProgressCue({ completeness }: ProgressCueProps) {
  return (
    <motion.div
      className="flex items-center justify-center gap-2 py-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div
        className="relative rounded-full overflow-hidden"
        style={{ width: 128, height: 6, background: 'var(--onb-border)' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--onb-coral), #FF7A6B)' }}
          initial={{ width: 0 }}
          animate={{ width: `${completeness}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--onb-font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--onb-text-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {completeness}% visible
      </span>
    </motion.div>
  )
}
