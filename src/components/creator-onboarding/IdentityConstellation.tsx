'use client'

import { motion } from 'framer-motion'

interface Axis {
  id: string
  label: string
  filled: boolean
}

interface IdentityConstellationProps {
  axes: Axis[]
}

export default function IdentityConstellation({ axes }: IdentityConstellationProps) {
  const filledCount = axes.filter(a => a.filled).length
  const pct = Math.round((filledCount / axes.length) * 100)

  return (
    <div className="onb-constellation-wrap">
      {/* Header row: label + percentage */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--onb-font-display)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--onb-text)',
              letterSpacing: '-0.1px',
            }}
          >
            Your visibility
          </div>
          <div
            style={{
              fontFamily: 'var(--onb-font-body)',
              fontSize: 10,
              color: 'var(--onb-text-muted)',
              marginTop: 2,
            }}
          >
            {pct === 0 && 'Fill in your details to become visible'}
            {pct > 0 && pct < 100 && `${pct}% complete — brands can see you`}
            {pct === 100 && 'Fully visible to brands'}
          </div>
        </div>

        {/* Circular progress */}
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgba(124,111,176,0.12)"
              strokeWidth="2.5"
            />
            <motion.circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--onb-coral)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15}
              initial={{ strokeDashoffset: 2 * Math.PI * 15 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 15 * (1 - pct / 100) }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--onb-font-display)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--onb-text)',
            }}
          >
            {pct}
          </div>
        </div>
      </div>

      {/* Dot row */}
      <div className="onb-constellation">
        {axes.map((axis, i) => (
          <div key={axis.id} className="flex items-center">
            <div className="onb-constellation-dot" data-filled={axis.filled}>
              <motion.div
                className="onb-constellation-dot__circle"
                animate={axis.filled ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              />
              <span className="onb-constellation-dot__label">{axis.label}</span>
            </div>
            {i < axes.length - 1 && (
              <div
                className="onb-constellation-line"
                data-filled={axis.filled}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
