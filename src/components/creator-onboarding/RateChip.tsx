'use client'

import { motion } from 'framer-motion'

interface RateChipProps {
  label: string
  value: number
  onChange: (value: number) => void
}

export default function RateChip({ label, value, onChange }: RateChipProps) {
  return (
    <motion.div
      className="p-3 rounded-xl"
      style={{
        border: `1px solid ${value > 0 ? 'var(--onb-green)' : 'var(--onb-border)'}`,
        background: value > 0 ? 'var(--onb-green-dim)' : 'rgba(22,20,40,0.4)',
        transition: 'all 0.15s',
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        style={{
          fontFamily: 'var(--onb-font-body)',
          fontSize: 12,
          color: 'var(--onb-text-dim)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: 'var(--onb-font-mono)',
            fontSize: 14,
            color: 'var(--onb-text-muted)',
          }}
        >
          ₹
        </span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="onb-input"
          style={{
            flex: 1,
            padding: '8px 10px',
            fontFamily: 'var(--onb-font-mono)',
            fontSize: 13,
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>
    </motion.div>
  )
}
