'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X, Info } from 'lucide-react'
import { useTutorialStore } from '@/lib/tutorial-store'
import { TUTORIAL_STEPS } from './tutorial-steps'

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

export default function TutorialOverlay() {
  const {
    isActive,
    currentStep,
    hasCompletedTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeStep,
    setStep,
    startTutorial,
  } = useTutorialStore()

  const [targetRect, setTargetRect] = useState<HighlightRect | null>(null)
  const [cardPos, setCardPos] = useState<{ top: number; left: number; arrow: string }>({ top: 0, left: 0, arrow: 'top' })
  const cardRef = useRef<HTMLDivElement>(null)

  const step = TUTORIAL_STEPS[currentStep]
  const total = TUTORIAL_STEPS.length
  const progress = ((currentStep + 1) / total) * 100
  const isLast = currentStep === total - 1
  const isFirst = currentStep === 0

  // Expose replay globally
  useEffect(() => {
    ;(window as any).__replayTutorial = () => startTutorial()
    return () => { delete (window as any).__replayTutorial }
  }, [startTutorial])

  // Measure only — never scrolls. Scrolling from here would re-enter via the
  // scroll listener and fight its own smooth-scroll animation, which is what
  // made the card land in arbitrary positions.
  const measureTarget = useCallback(() => {
    if (!step?.target) { setTargetRect(null); return }
    const el = document.querySelector(step.target) as HTMLElement | null
    if (!el) { setTargetRect(null); return }
    const r = el.getBoundingClientRect()
    // A zero-size box means the element is mounted but not laid out yet.
    if (r.width === 0 && r.height === 0) { setTargetRect(null); return }
    const pad = 6
    const next = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
    // The settle loop runs every frame; skip no-op updates so we don't
    // re-render (and re-run card positioning) ~40 times per step.
    setTargetRect(prev =>
      prev && prev.top === next.top && prev.left === next.left &&
      prev.width === next.width && prev.height === next.height
        ? prev
        : next
    )
  }, [step])

  // Per step: wait for the target to exist, scroll to it once, then track it
  // until the smooth scroll settles.
  useEffect(() => {
    if (!isActive || !step) return
    let cancelled = false
    let raf = 0
    const giveUpAt = performance.now() + 3000

    const trackUntilSettled = () => {
      const settleBy = performance.now() + 700
      const tick = () => {
        if (cancelled) return
        measureTarget()
        if (performance.now() < settleBy) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const waitForTarget = () => {
      if (cancelled) return
      if (!step.target) { setTargetRect(null); return }
      const el = document.querySelector(step.target) as HTMLElement | null
      if (!el) {
        // Target may belong to a lazily-mounted tab; keep looking briefly
        // instead of giving up and centring the card on screen.
        if (performance.now() < giveUpAt) { raf = requestAnimationFrame(waitForTarget); return }
        setTargetRect(null)
        return
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      trackUntilSettled()
    }

    waitForTarget()
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [isActive, step, measureTarget])

  // Keep the highlight glued to the target while the user scrolls or resizes.
  useEffect(() => {
    if (!isActive) return
    const onChange = () => measureTarget()
    window.addEventListener('resize', onChange)
    window.addEventListener('scroll', onChange, true)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
    }
  }, [isActive, measureTarget])

  // Position card relative to target
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const recalc = () => {
      const cw = Math.min(card.offsetWidth || 340, 380)
      const ch = card.offsetHeight || 140
      const gap = 12
      const vw = window.innerWidth
      const vh = window.innerHeight
      const placement = step?.placement || 'bottom'

      let top = 0, left = 0, arrow = 'top'

      if (!targetRect) {
        setCardPos({ top: vh / 2 - ch / 2, left: vw / 2 - cw / 2, arrow: 'top' })
        return
      }

      if (placement === 'bottom') {
        top = targetRect.top + targetRect.height + gap
        left = targetRect.left + targetRect.width / 2 - cw / 2
        arrow = 'top'
      } else if (placement === 'top') {
        top = targetRect.top - ch - gap
        left = targetRect.left + targetRect.width / 2 - cw / 2
        arrow = 'bottom'
      } else if (placement === 'left') {
        top = targetRect.top + targetRect.height / 2 - ch / 2
        left = targetRect.left - cw - gap
        arrow = 'right'
      } else {
        top = targetRect.top + targetRect.height / 2 - ch / 2
        left = targetRect.left + targetRect.width + gap
        arrow = 'left'
      }

      left = Math.max(12, Math.min(left, vw - cw - 12))
      top = Math.max(12, Math.min(top, vh - ch - 12))

      setCardPos({ top, left, arrow })
    }
    recalc()
    // Recalculate after card has rendered to get accurate dimensions
    const timer = setTimeout(recalc, 50)
    return () => clearTimeout(timer)
  }, [targetRect, step])

  // Keyboard
  useEffect(() => {
    if (!isActive) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTutorial()
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); handleNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevStep() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isActive, isLast])

  // NOTE: body scroll is deliberately NOT locked. Steps target elements further
  // down the page, and locking overflow made scrollIntoView a no-op for them —
  // the highlight then sat off-screen while the card was clamped to the edge.
  // The scroll listener above keeps the highlight aligned instead.

  const handleNext = () => {
    completeStep(step.id)
    if (isLast) skipTutorial()
    else nextStep()
  }

  if (!isActive || !step) return null

  const cardW = 340

  return (
    <>
      <style>{`
        @keyframes tut-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(26,115,232,0.35)} 50%{box-shadow:0 0 0 6px rgba(26,115,232,0)} }
        .tut-cutout{position:fixed;z-index:10002;pointer-events:none;border-radius:8px;border:2px solid rgba(26,115,232,0.7);box-shadow:0 0 0 4000px rgba(15,23,42,0.5);transition:all 0.35s cubic-bezier(0.16,1,0.3,1);animation:tut-pulse 2s ease-in-out infinite}
        .tut-btn{transition:all 0.15s;cursor:pointer;font-family:inherit}
        .tut-btn:hover{filter:brightness(1.05)}
      `}</style>

      {/* Transparent backdrop */}
      <div style={{ position:'fixed', inset:0, zIndex:10001, background:'transparent', pointerEvents:'none' }} />

      {/* Cutout highlight */}
      <AnimatePresence mode="wait">
        {targetRect && (
          <motion.div
            key={step.id}
            className="tut-cutout"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height }}
          />
        )}
      </AnimatePresence>

      {/* Click backdrop to dismiss — must sit BELOW the cutout (10002) so the
          highlight ring is not overpainted by a transparent catcher. */}
      <div onClick={skipTutorial} style={{ position:'fixed', inset:0, zIndex:10000, cursor:'pointer' }} />

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={cardRef}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: cardPos.top,
            left: cardPos.left,
            zIndex: 10003,
            width: cardW,
            maxWidth: 'calc(100vw - 24px)',
            background: '#FFFFFF',
            borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            pointerEvents: 'all',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          {/* Progress bar */}
          <div style={{ height: 2.5, background: '#F1F5F9' }}>
            <motion.div
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #1A73E8, #4C9AFF)', borderRadius: '0 2px 2px 0' }}
            />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#1A73E8',
                textTransform: 'uppercase', letterSpacing: '0.6px',
                background: 'rgba(26,115,232,0.08)', padding: '2px 7px', borderRadius: 4,
              }}>
                {currentStep + 1}/{total}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={skipTutorial} style={{
                padding: '3px 8px', borderRadius: 5, border: 'none',
                background: 'rgba(0,0,0,0.04)', color: '#94A3B8',
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
              >
                Skip
              </button>
              <button onClick={skipTutorial} style={{
                width: 22, height: 22, borderRadius: 5, border: 'none',
                background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              >
                <X size={11} style={{ color: '#94A3B8' }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '10px 14px 14px' }}>
            <h4 style={{
              fontSize: 14, fontWeight: 700, color: '#0F172A',
              margin: '0 0 4px', lineHeight: 1.3,
            }}>
              {step.title}
            </h4>
            <p style={{
              fontSize: 12, color: '#64748B', margin: 0,
              lineHeight: 1.5,
            }}>
              {step.tip}
            </p>

            {/* Navigation */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9',
            }}>
              <div>
                {!isFirst ? (
                  <button className="tut-btn" onClick={prevStep} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 7,
                    border: '1px solid #E2E8F0', background: '#FFF',
                    color: '#64748B', fontSize: 11, fontWeight: 600,
                  }}>
                    <ChevronLeft size={12} /> Back
                  </button>
                ) : <div />}
              </div>

              {/* Dots */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {TUTORIAL_STEPS.map((s, i) => (
                  <div key={s.id} onClick={() => setStep(i)} style={{
                    width: i === currentStep ? 16 : 5, height: 5,
                    borderRadius: i === currentStep ? 3 : '50%',
                    background: i === currentStep ? '#1A73E8' : i < currentStep ? 'rgba(26,115,232,0.3)' : '#E2E8F0',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }} />
                ))}
              </div>

              <button className="tut-btn" onClick={handleNext} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 12px', borderRadius: 7,
                border: 'none', background: '#1A73E8',
                color: '#FFF', fontSize: 11, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
              }}>
                {isLast ? 'Done' : 'Next'} <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
