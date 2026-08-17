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
          ? 'border-green-800 bg-green-950/20'
          : deferred
          ? 'border-amber-800/80 bg-amber-950/10'
          : 'border-slate-800 bg-slate-950/40'
        }
      `}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon || <DollarSign className="w-4 h-4 text-slate-500" />}
        <span className="text-sm font-medium text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">₹</span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800/80 text-slate-100 placeholder-slate-700 rounded-lg text-sm focus:outline-none focus:border-green-500 transition-all tabular-nums"
        />
      </div>
    </motion.div>
  )
}
