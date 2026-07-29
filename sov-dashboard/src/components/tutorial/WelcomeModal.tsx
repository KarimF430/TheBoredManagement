'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, ChevronRight } from 'lucide-react'
import { useTutorialStore } from '@/lib/tutorial-store'

const WELCOME_KEY = 'sov-welcome-dismissed'

export default function WelcomeModal() {
  const [show, setShow] = useState(false)
  const { hasCompletedTutorial, startTutorial, skipTutorial } = useTutorialStore()

  useEffect(() => {
    if (hasCompletedTutorial) return
    const dismissed = localStorage.getItem(WELCOME_KEY)
    if (dismissed === 'true') return
    const timer = setTimeout(() => setShow(true), 1000)
    return () => clearTimeout(timer)
  }, [hasCompletedTutorial])

  const handleStartTour = () => { setShow(false); startTutorial() }
  const handleSkip = () => { setShow(false); localStorage.setItem(WELCOME_KEY, 'true'); skipTutorial() }

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleSkip}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 380, margin: '0 16px',
            background: '#FFFFFF', borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)',
            overflow: 'hidden', pointerEvents: 'all',
          }}
        >
          <div style={{ height: 3, background: 'linear-gradient(90deg, #1A73E8, #4C9AFF)' }} />
          <div style={{ padding: '28px 28px 24px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #1A73E8, #4C9AFF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 16px rgba(26,115,232,0.25)',
            }}>
              <Rocket size={22} style={{ color: '#FFF' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
              Welcome to SOV Panel
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
              Track brand visibility and competitor rankings across YouTube.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <button
                onClick={handleStartTour}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 22px', borderRadius: 10,
                  border: 'none', background: '#1A73E8',
                  color: '#FFF', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 10px rgba(26,115,232,0.3)',
                }}
              >
                Take a tour <ChevronRight size={14} />
              </button>
              <button
                onClick={handleSkip}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  border: '1px solid #E2E8F0', background: '#FFF',
                  color: '#64748B', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
