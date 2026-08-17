'use client'

import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'

interface ProgressCueProps {
  completeness: number // 0-100
}

export default function ProgressCue({ completeness }: ProgressCueProps) {
  return (
    <motion.div
      className="flex items-center justify-center gap-2 py-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Eye className="w-3.5 h-3.5 text-slate-500" />
      <div className="relative w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${completeness}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[11px] font-medium text-slate-400 tabular-nums">
        {completeness}% visible
      </span>
    </motion.div>
  )
}
