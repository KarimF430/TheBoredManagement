'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react'

export default function CreatorOnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [errorType, setErrorType] = useState<'expired' | 'invalid' | 'missing'>('missing')

  useEffect(() => {
    if (!token) {
      const autoCreateSession = async () => {
        try {
          const res = await fetch('/api/creator-onboarding/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create_test' }),
          })
          const data = await res.json()
          if (res.ok && data.session?.token) {
            router.push(`/creator-onboarding/${data.session.token}/steps`)
          } else {
            setStatus('error')
            setErrorType('missing')
            setErrorMsg('Unable to automatically initiate a test onboarding session.')
          }
        } catch {
          setStatus('error')
          setErrorType('missing')
          setErrorMsg('Failed to automatically connect to creator portal.')
        }
      }
      autoCreateSession()
      return
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/creator-onboarding/session?token=${token}`)
        const data = await res.json()

        if (!res.ok) {
          setStatus('error')
          if (res.status === 410 || data.error?.toLowerCase().includes('expired')) {
            setErrorType('expired')
            setErrorMsg('This invitation link has expired. Request a new one from your manager.')
          } else {
            setErrorType('invalid')
            setErrorMsg(data.error || 'The invitation link is invalid.')
          }
          return
        }

        setStatus('success')
        setTimeout(() => {
          router.push(`/creator-onboarding/${token}/steps`)
        }, 1200)
      } catch {
        setStatus('error')
        setErrorType('invalid')
        setErrorMsg('Unable to connect. Check your internet and try again.')
      }
    }

    verifyToken()
  }, [token, router])

  return (
    <div className="onb-shell">
      <div className="onb-glow-top" />
      <div className="onb-glow-bottom" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="onb-card text-center"
      >
        {/* Brand Identity */}
        <div className="mb-8 flex justify-center">
          <motion.div
            animate={
              status === 'loading'
                ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }
                : {}
            }
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, var(--onb-coral) 0%, #FF7A6B 100%)',
              boxShadow: '0 8px 32px rgba(255,90,95,0.3)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--onb-font-display)',
                fontSize: 28,
                fontWeight: 800,
                color: '#FFF',
                letterSpacing: -1,
              }}
            >
              TBM
            </span>
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 rounded-full p-1"
                style={{ background: 'var(--onb-green)', border: '2px solid var(--onb-bg)' }}
              >
                <Sparkles className="w-4 h-4" style={{ color: '#FFF' }} />
              </motion.div>
            )}
          </motion.div>
        </div>

        <h1
          className="onb-title"
          style={{ fontSize: 28 }}
        >
          Creator Onboarding
        </h1>
        <p className="onb-subtitle">TheBoredMonkey Creator Portal</p>

        {/* Content Box */}
        <div className="mt-8 min-h-[140px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--onb-coral)' }} />
                <div className="space-y-1">
                  <p style={{ fontFamily: 'var(--onb-font-display)', fontSize: 14, fontWeight: 700, color: 'var(--onb-text)' }}>
                    Verifying Invitation
                  </p>
                  <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 12, color: 'var(--onb-text-muted)' }}>
                    Securing your session...
                  </p>
                </div>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--onb-green-dim)', border: '1px solid rgba(63,191,143,0.2)' }}
                >
                  <Sparkles className="w-6 h-6 animate-pulse" style={{ color: 'var(--onb-green)' }} />
                </motion.div>
                <div className="space-y-1">
                  <p style={{ fontFamily: 'var(--onb-font-display)', fontSize: 14, fontWeight: 700, color: 'var(--onb-green)' }}>
                    Identity Verified
                  </p>
                  <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 12, color: 'var(--onb-text-muted)' }}>
                    Redirecting to your profile wizard...
                  </p>
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 p-5 rounded-2xl w-full"
                style={{
                  background: 'rgba(220,38,38,0.05)',
                  border: '1px solid rgba(220,38,38,0.15)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.15)' }}
                >
                  {errorType === 'expired' ? (
                    <AlertCircle className="w-6 h-6" style={{ color: '#F87171' }} />
                  ) : (
                    <ShieldAlert className="w-6 h-6" style={{ color: '#F87171' }} />
                  )}
                </div>
                <div className="space-y-2 text-center">
                  <p style={{ fontFamily: 'var(--onb-font-display)', fontSize: 14, fontWeight: 700, color: '#F87171' }}>
                    {errorType === 'expired' ? 'Invite Expired' : errorType === 'missing' ? 'Invitation Required' : 'Verification Failed'}
                  </p>
                  <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 12, color: 'var(--onb-text-dim)', lineHeight: 1.6, padding: '0 8px' }}>
                    {errorMsg}
                  </p>
                </div>
                {errorType === 'expired' && (
                  <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 10, color: 'var(--onb-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Please request a new link from your manager
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
        <p style={{ fontFamily: 'var(--onb-font-body)', fontSize: 10, color: 'var(--onb-text-muted)', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Powered by <span style={{ color: 'var(--onb-coral)' }}>TheBoredMonkey</span>
        </p>
      </footer>
    </div>
  )
}
