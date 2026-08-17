'use client'

import { motion } from 'framer-motion'
import { DollarSign } from 'lucide-react'

interface RateChipProps {
  label: string
  value: number
  onChange: (value: number) => void
  icon?: React.ReactNode
  deferred?: boolean
}

export default function RateChip({ label, value, onChange, icon, deferred = false }: RateChipProps) {
  return (
    <motion.div
      className={`
        p-3 rounded-xl border transition-all
        ${value > 0
          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
          : deferred
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
          : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
        }
      `}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon || <DollarSign className="w-4 h-4 text-gray-400" />}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">₹</span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 tabular-nums"
        />
      </div>
    </motion.div>
  )
}
