'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface ConfirmPromptProps {
  title: string
  subtitle?: string
  onConfirm: () => void
  onReject: () => void
  confirmLabel?: string
  rejectLabel?: string
}

export default function ConfirmPrompt({
  title,
  subtitle,
  onConfirm,
  onReject,
  confirmLabel = 'Looks right',
  rejectLabel = 'Let me choose',
}: ConfirmPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl"
      style={{
        background: 'var(--onb-coral-dim)',
        border: '1px solid rgba(255,90,95,0.15)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" style={{ color: 'var(--onb-coral)' }} />
        <span
          style={{
            fontFamily: 'var(--onb-font-display)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--onb-coral)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          AI suggestion
        </span>
      </div>

      <div
        style={{
          fontFamily: 'var(--onb-font-display)',
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--onb-text)',
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontFamily: 'var(--onb-font-body)',
            fontSize: 13,
            color: 'var(--onb-text-dim)',
            marginBottom: 16,
          }}
        >
          {subtitle}
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl font-semibold text-sm"
          style={{
            fontFamily: 'var(--onb-font-display)',
            background: 'var(--onb-coral)',
            color: '#FFF',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255,90,95,0.25)',
          }}
          whileTap={{ scale: 0.97 }}
        >
          {confirmLabel}
        </motion.button>
        <motion.button
          onClick={onReject}
          className="flex-1 py-3 rounded-xl font-semibold text-sm"
          style={{
            fontFamily: 'var(--onb-font-display)',
            background: 'transparent',
            color: 'var(--onb-text-dim)',
            border: '1px solid var(--onb-border)',
            cursor: 'pointer',
          }}
          whileTap={{ scale: 0.97 }}
        >
          {rejectLabel}
        </motion.button>
      </div>
    </motion.div>
  )
}
