'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, PartyPopper, ArrowRight, Sparkles } from 'lucide-react'

export default function OnboardingSuccessPage() {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="onb-shell">
      <div className="onb-glow-top" />
      <div className="onb-glow-bottom" />

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#FF5A5F', '#7C6FB0', '#3FBF8F', '#FF7A6B', '#A78BFA'][i % 5],
              }}
              initial={{ y: -20, opacity: 1, scale: 1 }}
              animate={{
                y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
                opacity: 0,
                scale: 0,
                rotate: Math.random() * 360,
                x: (Math.random() - 0.5) * 200,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="onb-card text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="relative mx-auto mb-6 w-24 h-24"
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--onb-green) 0%, #2DD4A8 100%)',
              boxShadow: '0 8px 32px rgba(63,191,143,0.3)',
            }}
          >
            <CheckCircle className="w-12 h-12" style={{ color: '#FFF' }} />
          </div>
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <PartyPopper className="w-8 h-8" style={{ color: '#FBBF24' }} />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="onb-title"
          style={{ fontSize: 28 }}
        >
          Profile Complete!
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="onb-subtitle"
          style={{ maxWidth: 320, margin: '8px auto 0' }}
        >
          Your creator profile has been submitted. We&apos;ll review it and get back to you with brand matches.
        </motion.p>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 my-8"
        >
          <div className="p-4 rounded-xl" style={{ background: 'rgba(22,20,40,0.6)', border: '1px solid var(--onb-border)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--onb-coral-dim)', border: '1px solid rgba(255,90,95,0.15)' }}
              >
                <Sparkles className="w-5 h-5" style={{ color: 'var(--onb-coral)' }} />
              </div>
              <div className="text-left">
                <p style={{ fontFamily: 'var(--onb-font-display)', fontSize: 13, fontWeight: 700, color: 'var(--onb-text)' }}>AI Matching Active</p>
                <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 11, color: 'var(--onb-text-muted)' }}>Our algorithm will find the best brand fits</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'rgba(22,20,40,0.6)', border: '1px solid var(--onb-border)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--onb-green-dim)', border: '1px solid rgba(63,191,143,0.15)' }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--onb-green)' }} />
              </div>
              <div className="text-left">
                <p style={{ fontFamily: 'var(--onb-font-display)', fontSize: 13, fontWeight: 700, color: 'var(--onb-text)' }}>Profile Verified</p>
                <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 11, color: 'var(--onb-text-muted)' }}>Your data is now in our creator database</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* What's Next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-4 rounded-xl mb-6"
          style={{ background: 'rgba(22,20,40,0.3)', border: '1px solid var(--onb-border)' }}
        >
          <h3 style={{ fontFamily: 'var(--onb-font-display)', fontSize: 13, fontWeight: 700, color: 'var(--onb-text)', marginBottom: 12 }}>
            What happens next?
          </h3>
          <div className="space-y-2 text-left">
            {[
              'We review your profile (usually within 24-48 hours)',
              'Our AI matches you with relevant brand campaigns',
              'You receive email notifications for opportunities',
              'Accept campaigns that fit your niche and audience',
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--onb-coral)', marginTop: 2 }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#FFF' }}>{index + 1}</span>
                </div>
                <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 12, color: 'var(--onb-text-dim)' }}>{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Close Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => window.close()}
          className="onb-btn-primary inline-flex items-center justify-center gap-2"
          style={{ width: 'auto', padding: '14px 32px' }}
        >
          Done
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
          style={{ fontFamily: 'var(--onb-font-body)', fontSize: 12, color: 'var(--onb-text-muted)' }}
        >
          Questions? Reply to the email you received or contact{' '}
          <span style={{ fontWeight: 700, color: 'var(--onb-coral)' }}>TheBoredMonkey</span>
        </motion.p>
      </motion.div>
    </div>
  )
}
