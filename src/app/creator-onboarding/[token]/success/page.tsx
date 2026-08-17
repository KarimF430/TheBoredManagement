'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, PartyPopper, ArrowRight, Sparkles } from 'lucide-react'

export default function OnboardingSuccessPage() {
  const searchParams = useSearchParams()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Premium glowing backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5],
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
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="relative mx-auto mb-6 w-24 h-24"
        >
          <div className="w-24 h-24 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/20">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <PartyPopper className="w-8 h-8 text-yellow-500" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-slate-100 mb-3"
        >
          Profile Complete!
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 mb-8 max-w-sm mx-auto text-sm"
        >
          Your creator profile has been submitted successfully. We&apos;ll review it and get back to you with brand matches.
        </motion.p>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 mb-8"
        >
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-950/40 border border-blue-800/50 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-450" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-200">AI Matching Active</p>
                <p className="text-xs text-slate-450">Our algorithm will find the best brand fits for you</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-950/40 border border-green-800/50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-450" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-200">Profile Verified</p>
                <p className="text-xs text-slate-450">Your data is now in our creator database</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* What's Next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-4 bg-slate-950/30 border border-slate-800/60 rounded-xl mb-6"
        >
          <h3 className="text-sm font-semibold text-slate-200 mb-3">What happens next?</h3>
          <div className="space-y-2 text-left">
            {[
              'We review your profile (usually within 24-48 hours)',
              'Our AI matches you with relevant brand campaigns',
              'You receive email notifications for brand opportunities',
              'Accept campaigns that fit your niche and audience',
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-xs text-slate-400">{step}</p>
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
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-500/15"
        >
          Done
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-xs text-slate-500"
        >
          Questions? Reply to the email you received or contact{' '}
          <span className="font-bold text-orange-500/80">TheBoredMonkey</span>
        </motion.p>
      </motion.div>
    </div>
  )
}
