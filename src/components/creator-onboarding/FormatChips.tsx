'use client'

import { motion } from 'framer-motion'
import { CONTENT_FORMATS } from '@/lib/creator-onboarding-taxonomy'

interface FormatChipsProps {
  selected: string[]
  onChange: (formats: string[]) => void
}

export default function FormatChips({ selected, onChange }: FormatChipsProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(f => f !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="onb-label">How do you create?</div>
        <p style={{ fontSize: 12, color: 'var(--onb-text-muted)', fontFamily: 'var(--onb-font-body)' }}>
          Select all that apply
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTENT_FORMATS.map((format) => {
          const isSelected = selected.includes(format.id)
          return (
            <motion.button
              key={format.id}
              onClick={() => toggle(format.id)}
              className="onb-chip"
              data-selected={isSelected}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>{format.emoji}</span>
              <span>{format.label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
