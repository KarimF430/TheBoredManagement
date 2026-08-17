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
      className={`
        w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all
        ${selected
          ? 'border-blue-500 bg-blue-950/40 text-blue-400 shadow-lg shadow-blue-500/10'
          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60 text-slate-100'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {icon && (
        <div className={`flex-shrink-0 ${selected ? 'text-blue-400' : 'text-slate-400'}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${selected ? 'text-blue-400' : 'text-slate-200'}`}>
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>
        )}
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  )
}
