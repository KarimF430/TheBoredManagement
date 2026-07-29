'use client'

import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { useTutorialStore } from '@/lib/tutorial-store'

export default function TutorialTrigger() {
  const { startTutorial, isActive } = useTutorialStore()

  if (isActive) return null

  return (
    <motion.button
      onClick={startTutorial}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9990,
        width: 36,
        height: 36,
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.06)',
        background: '#FFFFFF',
        color: '#64748B',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        fontFamily: 'inherit',
        outline: 'none',
      }}
      title="Quick guide"
    >
      <Info size={16} />
    </motion.button>
  )
}
