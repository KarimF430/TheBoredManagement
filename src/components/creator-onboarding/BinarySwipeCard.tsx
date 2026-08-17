'use client'

import { useState, useRef, useCallback } from 'react'
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
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ x, rotate }}
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
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg"
          style={{ opacity: yesOpacity }}
        >
          <ThumbsUp className="w-4 h-4" />
          {yesLabel}
        </motion.div>
        <motion.div
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-gray-400 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg"
          style={{ opacity: noOpacity }}
        >
          <ThumbsDown className="w-4 h-4" />
          {noLabel}
        </motion.div>

        {/* Question */}
        <div className="p-8 flex items-center justify-center min-h-[200px]">
          <p className="text-lg font-semibold text-center text-gray-900 dark:text-white leading-relaxed">
            {question}
          </p>
        </div>
      </motion.div>

      {/* Button fallback */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => { setExitX(-200); setSwiped(true); onSwipeLeft() }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium text-sm"
        >
          <ThumbsDown className="w-4 h-4" />
          {noLabel}
        </button>
        <button
          onClick={() => { setExitX(200); setSwiped(true); onSwipeRight() }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all font-medium text-sm shadow-lg shadow-green-500/25"
        >
          <ThumbsUp className="w-4 h-4" />
          {yesLabel}
        </button>
      </div>

      {/* Swipe hint */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-gray-400">
        <span>← Not now</span>
        <span className="w-1 h-1 rounded-full bg-gray-300" />
        <span>Yes →</span>
      </div>
    </div>
  )
}
