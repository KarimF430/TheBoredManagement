'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, ShieldAlert, Sparkles, CheckCircle } from 'lucide-react'

export default function CreatorOnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [errorType, setErrorType] = useState<'expired' | 'invalid' | 'missing'>('loading')

  useEffect(() => {
    if (!token) {
      // Bypassing invitation block: auto-create a test session and redirect
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
            setErrorMsg('This onboarding invitation link has expired. Invitation links are valid for 7 days for security reasons.')
          } else {
            setErrorType('invalid')
            setErrorMsg(data.error || 'The invitation link is invalid or has been modified.')
          }
          return
        }

        setStatus('success')
        // Short delay for visual polish and transition feel
        setTimeout(() => {
          router.push(`/creator-onboarding/${token}/steps`)
        }, 1200)
      } catch (err) {
        setStatus('error')
        setErrorType('invalid')
        setErrorMsg('Unable to connect to the server. Please check your internet connection and try again.')
      }
    }

    verifyToken()
  }, [token, router])

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Premium glowing backdrops */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative dots grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
      >
        {/* Animated Brand Identity */}
        <div className="mb-8 relative flex justify-center">
          <motion.div
            animate={
              status === 'loading'
                ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }
                : {}
            }
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-blue-400/20 relative"
          >
            <span className="text-3xl font-extrabold text-white tracking-wider">TBM</span>
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-slate-900"
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
            )}
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
          Creator Onboarding
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          TheBoredMonkey Creator Portal
        </p>

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
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <div className="absolute inset-0 w-10 h-10 border border-blue-500/20 rounded-full" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">Verifying Invitation</p>
                  <p className="text-xs text-slate-500">Securing your session token...</p>
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
                  className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400"
                >
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </motion.div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-400">Identity Verified</p>
                  <p className="text-xs text-slate-500">Redirecting to your wizard profile...</p>
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 p-5 rounded-2xl bg-red-500/5 border border-red-500/20 text-center w-full"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  {errorType === 'expired' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-red-400">
                    {errorType === 'expired' ? 'Invite Expired' : errorType === 'missing' ? 'Invitation Required' : 'Verification Failed'}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed px-2">
                    {errorMsg}
                  </p>
                </div>
                {errorType === 'expired' && (
                  <p className="text-[10px] text-slate-600 font-semibold uppercase mt-1 tracking-wider">
                    Please request a new link from your manager
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Premium minimalist branding */}
      <footer className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-[10px] text-slate-600 font-semibold tracking-[0.2em] uppercase">
          Powered by <span className="text-orange-500/80 font-bold">TheBoredMonkey</span>
        </p>
      </footer>
    </div>
  )
}
