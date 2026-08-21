'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface BinarySwipeCardProps {
  question: string
  onSwipeRight: () => void
  onSwipeLeft: () => void
  yesLabel?: string
  noLabel?: string
}

export default function BinarySwipeCard({
  question,
  onSwipeRight,
  onSwipeLeft,
  yesLabel = 'Yes',
  noLabel = 'Not now',
}: BinarySwipeCardProps) {
  const x = useMotionValue(0)
  const [exitX, setExitX] = useState(0)
  const [swiped, setSwiped] = useState(false)

  const rotate = useTransform(x, [-200, 0, 200], [-8, 0, 8])
  const yesOpacity = useTransform(x, [0, 100], [0, 1])
  const noOpacity = useTransform(x, [-100, 0], [1, 0])

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const threshold = 80
      const velocityThreshold = 400

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        setExitX(200)
        setSwiped(true)
        onSwipeRight()
      } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        setExitX(-200)
        setSwiped(true)
        onSwipeLeft()
      }
    },
    [onSwipeLeft, onSwipeRight]
  )

  if (swiped) return null

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <motion.div
        className="relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          x,
          rotate,
          background: 'var(--onb-card)',
          border: '1px solid var(--onb-border)',
          backdropFilter: 'blur(24px)',
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ x: exitX, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        {/* Swipe indicators */}
        <motion.div
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm"
          style={{
            opacity: yesOpacity,
            background: 'var(--onb-green)',
            color: '#FFF',
            boxShadow: '0 4px 12px rgba(63,191,143,0.3)',
          }}
        >
          <ThumbsUp className="w-4 h-4" />
          {yesLabel}
        </motion.div>
        <motion.div
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm"
          style={{
            opacity: noOpacity,
            background: 'rgba(107,99,128,0.6)',
            color: '#FFF',
          }}
        >
          <ThumbsDown className="w-4 h-4" />
          {noLabel}
        </motion.div>

        {/* Question */}
        <div className="p-8 flex items-center justify-center min-h-[200px]">
          <p
            style={{
              fontFamily: 'var(--onb-font-display)',
              fontSize: 18,
              fontWeight: 700,
              textAlign: 'center',
              color: 'var(--onb-text)',
              lineHeight: 1.4,
            }}
          >
            {question}
          </p>
        </div>
      </motion.div>

      {/* Button fallback */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => { setExitX(-200); setSwiped(true); onSwipeLeft() }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm"
          style={{
            fontFamily: 'var(--onb-font-display)',
            border: '1px solid var(--onb-border)',
            background: 'transparent',
            color: 'var(--onb-text-dim)',
            cursor: 'pointer',
          }}
        >
          <ThumbsDown className="w-4 h-4" />
          {noLabel}
        </button>
        <button
          onClick={() => { setExitX(200); setSwiped(true); onSwipeRight() }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm"
          style={{
            fontFamily: 'var(--onb-font-display)',
            background: 'var(--onb-green)',
            color: '#FFF',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(63,191,143,0.25)',
          }}
        >
          <ThumbsUp className="w-4 h-4" />
          {yesLabel}
        </button>
      </div>

      {/* Swipe hint */}
      <div
        className="mt-3 flex items-center justify-center gap-4"
        style={{ fontSize: 11, color: 'var(--onb-text-muted)', fontFamily: 'var(--onb-font-body)' }}
      >
        <span>← {noLabel}</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--onb-border)' }} />
        <span>{yesLabel} →</span>
      </div>
    </div>
  )
}
