'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onConfirm?: () => void
  canGoBack?: boolean
  onBack?: () => void
  title: string
  subtitle?: string
  step: number
  totalSteps: number
  isOptional?: boolean
  disableSwipe?: boolean
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onConfirm,
  canGoBack,
  onBack,
  title,
  subtitle,
  step,
  totalSteps,
  isOptional = false,
  disableSwipe = false,
}: SwipeableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [exitX, setExitX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5])

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      setIsDragging(false)
      const threshold = 100
      const velocityThreshold = 500

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        setExitX(200)
        onSwipeRight?.()
      } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        setExitX(-200)
        onSwipeLeft?.()
      }
    },
    [onSwipeLeft, onSwipeRight]
  )

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Progress Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {canGoBack && onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-100">{title}</h2>
              {subtitle && (
                <p className="text-xs text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="text-xs font-medium text-slate-500">
            {step} / {totalSteps}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-850 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          ref={cardRef}
          className="relative bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden"
          style={{ x, rotate, opacity }}
          drag={disableSwipe ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ x: exitX, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          {/* Swipe Indicators */}
          {!disableSwipe && (
            <>
              <motion.div
                className="absolute top-4 right-4 z-10 bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg"
                style={{
                  opacity: useTransform(x, [0, 100], [0, 1]),
                }}
              >
                NEXT →
              </motion.div>
              <motion.div
                className="absolute top-4 left-4 z-10 bg-slate-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg"
                style={{
                  opacity: useTransform(x, [-100, 0], [1, 0]),
                }}
              >
                ← SKIP
              </motion.div>
            </>
          )}

          {/* Card Content */}
          <div className="p-6 text-slate-100">{children}</div>

          {/* Card Footer */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between gap-3">
              {!disableSwipe && onSwipeLeft && (
                <button
                  onClick={onSwipeLeft}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 transition-all font-medium text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Skip
                  {isOptional && (
                    <span className="text-xs text-slate-500">(Optional)</span>
                  )}
                </button>
              )}
              {onConfirm && (
                <button
                  onClick={onConfirm}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all font-medium text-sm shadow-lg shadow-blue-500/15"
                >
                  <Check className="w-4 h-4" />
                  Continue
                </button>
              )}
              {!disableSwipe && onSwipeRight && (
                <button
                  onClick={onSwipeRight}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all font-medium text-sm shadow-lg shadow-blue-500/15"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Swipe Hint */}
      {!disableSwipe && (
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Swipe left to skip
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-850" />
          <span className="flex items-center gap-1">
            Swipe right to continue <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </div>
  )
}
