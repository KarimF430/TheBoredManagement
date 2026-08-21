'use client'

import { motion } from 'framer-motion'
import { CREATOR_TYPES } from '@/lib/creator-onboarding-taxonomy'

interface TypeCardProps {
  selected: string | null
  onSelect: (type: string) => void
}

export default function TypeCard({ selected, onSelect }: TypeCardProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="onb-label">Who creates with you?</div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {CREATOR_TYPES.map((type) => {
          const isSelected = selected === type.id
          return (
            <motion.button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all"
              style={{
                borderColor: isSelected ? 'var(--onb-coral)' : 'var(--onb-border)',
                background: isSelected ? 'var(--onb-coral-dim)' : 'rgba(22,20,40,0.4)',
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span style={{ fontSize: 28 }}>{type.emoji}</span>
              <span
                style={{
                  fontFamily: 'var(--onb-font-display)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: isSelected ? 'var(--onb-coral)' : 'var(--onb-text)',
                }}
              >
                {type.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--onb-font-body)',
                  fontSize: 10,
                  color: 'var(--onb-text-muted)',
                }}
              >
                {type.description}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
