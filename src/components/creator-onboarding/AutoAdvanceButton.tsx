'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface AutoAdvanceButtonProps {
  label: string
  sublabel?: string
  onSelect: () => void
  delayMs?: number
  selected?: boolean
  disabled?: boolean
  icon?: React.ReactNode
}

export default function AutoAdvanceButton({
  label,
  sublabel,
  onSelect,
  delayMs = 250,
  selected = false,
  disabled = false,
  icon,
}: AutoAdvanceButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleClick = () => {
    if (disabled || selected) return
    onSelect()
    timerRef.current = setTimeout(() => {}, delayMs)
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all"
      style={{
        borderColor: selected ? 'var(--onb-coral)' : 'var(--onb-border)',
        background: selected ? 'var(--onb-coral-dim)' : 'rgba(22,20,40,0.4)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {icon && (
        <div style={{ flexShrink: 0, color: selected ? 'var(--onb-coral)' : 'var(--onb-text-muted)' }}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          style={{
            fontFamily: 'var(--onb-font-display)',
            fontSize: 13,
            fontWeight: 700,
            color: selected ? 'var(--onb-coral)' : 'var(--onb-text)',
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div style={{ fontFamily: 'var(--onb-font-body)', fontSize: 11, color: 'var(--onb-text-muted)', marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--onb-coral)' }}
        >
          <svg className="w-3 h-3" style={{ color: '#FFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  )
}
