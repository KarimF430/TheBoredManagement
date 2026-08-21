'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { INDIAN_LANGUAGES, type LanguageCode } from '@/lib/creator-onboarding-taxonomy'

interface PredictiveLanguageSelectProps {
  selected: string[]
  onChange: (languages: string[]) => void
  creatorState?: string
}

export default function PredictiveLanguageSelect({
  selected,
  onChange,
  creatorState,
}: PredictiveLanguageSelectProps) {
  const [expanded, setExpanded] = useState(false)

  // Pre-select likely languages based on state
  const predicted = useMemo(() => {
    const codes: string[] = []
    codes.push('en') // Always include English
    codes.push('hi') // Always include Hindi

    if (creatorState) {
      for (const lang of INDIAN_LANGUAGES) {
        if ((lang.states as readonly string[]).includes(creatorState) && !codes.includes(lang.code)) {
          codes.push(lang.code)
        }
      }
    }

    return codes
  }, [creatorState])

  // Separate predicted from rest
  const predictedLangs = INDIAN_LANGUAGES.filter(l => predicted.includes(l.code))
  const otherLangs = INDIAN_LANGUAGES.filter(l => !predicted.includes(l.code))

  const visibleLangs = expanded ? otherLangs : otherLangs.slice(0, 4)

  const toggleLang = (code: string) => {
    if (selected.includes(code)) {
      // Don't allow deselecting if it's the last one
      if (selected.length <= 1) return
      onChange(selected.filter(c => c !== code))
    } else {
      onChange([...selected, code])
    }
  }

  const togglePredicted = (code: string) => {
    // Predicted languages start checked; toggling removes them
    if (selected.includes(code)) {
      if (selected.length <= 1) return
      onChange(selected.filter(c => c !== code))
    } else {
      onChange([...selected, code])
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="onb-label">Languages you create in</div>
        <p style={{ fontSize: 12, color: 'var(--onb-text-muted)', marginBottom: 12, fontFamily: 'var(--onb-font-body)' }}>
          We pre-selected based on your location — adjust as needed
        </p>
      </div>

      {/* Predicted / likely languages */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--onb-violet)', fontWeight: 600, marginBottom: 8, fontFamily: 'var(--onb-font-body)' }}>
          We think you speak
        </div>
        <div className="flex flex-wrap gap-2">
          {predictedLangs.map((lang) => {
            const isSelected = selected.includes(lang.code)
            return (
              <motion.button
                key={lang.code}
                onClick={() => togglePredicted(lang.code)}
                className="onb-chip"
                data-selected={isSelected}
                whileTap={{ scale: 0.95 }}
              >
                {lang.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Other languages */}
      <div>
        <div className="flex flex-wrap gap-2">
          {visibleLangs.map((lang) => {
            const isSelected = selected.includes(lang.code)
            return (
              <motion.button
                key={lang.code}
                onClick={() => toggleLang(lang.code)}
                className="onb-chip"
                data-selected={isSelected}
                whileTap={{ scale: 0.95 }}
              >
                {lang.label}
              </motion.button>
            )
          })}
        </div>

        {/* More/expander */}
        {otherLangs.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="onb-skip flex items-center gap-1 mt-2"
            style={{ fontSize: 12 }}
          >
            {expanded ? (
              <>Show less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>+{otherLangs.length - 4} more languages <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>

      {/* Selected count */}
      {selected.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--onb-text-muted)', fontFamily: 'var(--onb-font-body)' }}>
          {selected.length} language{selected.length > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
