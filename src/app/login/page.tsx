'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, KeyRound, AlertCircle, Loader2, ArrowRight, ArrowLeft,
  ShieldCheck, Check, RefreshCw,
} from 'lucide-react'

/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ════════════════════════════════════════════════════════════ */
const C = {
  ink:       '#0F172A',
  inkSoft:   '#1E293B',
  text:      '#475569',
  muted:     '#64748B',
  faint:     '#94A3B8',
  line:      'rgba(26,115,232,0.10)',
  blue:      '#1A73E8',
  blueDim:   'rgba(26,115,232,0.08)',
  orange:    '#F58220',
  orangeDim: 'rgba(245,130,32,0.10)',
  green:     '#00C853',
  violet:    '#7C3AED',
  red:       '#FF2D55',
  redDim:    'rgba(255,45,85,0.08)',
}

const BRAND_CHIPS = ['atomberg', 'boAt', 'wakefit', 'Zepto', 'PhonePe', 'One']

const SOV_DATA = [
  { label: 'Your Brand',     value: 34, color: C.orange, you: true },
  { label: 'Competitor A',   value: 26, color: C.blue,   you: false },
  { label: 'Competitor B',   value: 22, color: C.violet, you: false },
  { label: 'Competitor C',   value: 18, color: C.green,  you: false },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_RE = /^\d{6}$/

const ease = [0.16, 1, 0.3, 1] as const

type Step = 'email' | 'otp'

/* ════════════════════════════════════════════════════════════
   SMALL PIECES
   ════════════════════════════════════════════════════════════ */

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <img
        src="/tbm-logo.png"
        alt="TheBoredMonkey"
        style={{ height: 40, width: 'auto', display: 'block' }}
      />
    </div>
  )
}

function SovPreview() {
  const max = Math.max(...SOV_DATA.map(d => d.value))
  return (
    <div style={{
      borderRadius: 20,
      border: '1.5px solid rgba(255,255,255,0.65)',
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: '0 20px 60px -20px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.inkSoft, letterSpacing: '-0.2px' }}>
            Share of Voice
          </div>
          <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, marginTop: 2 }}>
            Top brands · this keyword set
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10.5, fontWeight: 700, color: C.green,
          padding: '4px 10px', borderRadius: 99,
          background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.18)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: C.green,
            boxShadow: '0 0 0 0 rgba(0,200,83,0.5)',
            animation: 'sovPulse 2s infinite',
          }} />
          LIVE
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {SOV_DATA.map((d, i) => (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{
                fontSize: 11.5, fontWeight: d.you ? 800 : 600,
                color: d.you ? C.inkSoft : C.muted,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {d.you && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.4px',
                    color: C.orange, background: C.orangeDim,
                    padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase',
                  }}>You</span>
                )}
                {d.label}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: d.color, fontVariantNumeric: 'tabular-nums' }}>
                {d.value}%
              </span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: 'rgba(26,115,232,0.06)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(d.value / max) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.35 + i * 0.12, ease }}
                style={{
                  height: '100%', borderRadius: 99,
                  background: `linear-gradient(90deg, ${d.color}, ${d.color}99)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 18,
        paddingTop: 14, borderTop: '1px solid rgba(26,115,232,0.06)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.inkSoft, fontVariantNumeric: 'tabular-nums' }}>1,284</div>
          <div style={{ fontSize: 10, color: C.faint, fontWeight: 600 }}>Videos tracked</div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.inkSoft, fontVariantNumeric: 'tabular-nums' }}>312</div>
          <div style={{ fontSize: 10, color: C.faint, fontWeight: 600 }}>Keywords</div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums' }}>+18%</div>
          <div style={{ fontSize: 10, color: C.faint, fontWeight: 600 }}>This week</div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   OTP INPUT COMPONENT
   ════════════════════════════════════════════════════════════ */

function OTPInput({ value, onChange, autoFocus }: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6)

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus()
  }, [autoFocus])

  return (
    <div
      style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
      onClick={() => inputRef.current?.focus()}
    >
      {digits.map((d, i) => (
        <div
          key={i}
          style={{
            width: 48, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: C.ink,
            background: '#FFFFFF',
            border: `2px solid ${d ? C.orange : 'rgba(26,115,232,0.12)'}`,
            borderRadius: 12,
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            boxShadow: d ? '0 0 0 3px rgba(245,130,32,0.10)' : 'none',
          }}
        >
          {d}
        </div>
      ))}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        value={value}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
          onChange(v)
        }}
        style={{
          position: 'absolute', opacity: 0, width: 0, height: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [remember, setRemember] = useState(false)
  const [focused, setFocused] = useState<'email' | 'otp' | null>(null)

  const [fieldError, setFieldError] = useState<{ email?: string; otp?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  // Resend cooldown
  const [resendCountdown, setResendCountdown] = useState(0)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const startCountdown = useCallback(() => {
    setResendCountdown(60)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  /* prefill remembered email */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('sov_remember_email')
        if (saved) { setEmail(saved); setRemember(true) }
      } catch {}
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  /* ── Step 1: Send OTP ── */
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setFieldError({})

    if (!email.trim()) {
      setFieldError({ email: 'Enter your email address' })
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError({ email: 'That email doesn\'t look right' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')

      if (remember) {
        try { localStorage.setItem('sov_remember_email', email.trim()) } catch {}
      } else {
        try { localStorage.removeItem('sov_remember_email') } catch {}
      }

      setOtpSent(true)
      setStep('otp')
      startCountdown()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.')
      setShake(s => s + 1)
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setFieldError({})

    if (!OTP_RE.test(otpValue)) {
      setFieldError({ otp: 'Enter the 6-digit code' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otpValue }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')

      setSuccess(true)
      setTimeout(() => {
        router.push('/workspace')
        router.refresh()
      }, 900)
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Invalid code.')
      setShake(s => s + 1)
      setOtpValue('')
    } finally {
      setLoading(false)
    }
  }

  /* ── Resend OTP ── */
  const handleResend = async () => {
    if (resendCountdown > 0) return
    setServerError(null)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP')
      startCountdown()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to resend.')
    }
  }

  /* ── Back to email ── */
  const handleBack = () => {
    setStep('email')
    setOtpValue('')
    setServerError(null)
    setFieldError({})
    setOtpSent(false)
  }

  /* ── field shells ── */
  const fieldBase: React.CSSProperties = {
    width: '100%',
    height: 48,
    padding: '0 14px',
    paddingLeft: 46,
    fontSize: 14,
    fontFamily: 'inherit',
    color: C.ink,
    background: '#FFFFFF',
    border: '1.5px solid var(--border-1)',
    borderRadius: 12,
    outline: 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
    boxSizing: 'border-box',
  }

  const fieldFocused: React.CSSProperties = {
    borderColor: C.orange,
    boxShadow: '0 0 0 4px rgba(245,130,32,0.12)',
    background: '#FFFFFF',
  }

  const fieldErrorStyle: React.CSSProperties = {
    borderColor: 'rgba(255,45,85,0.45)',
    boxShadow: '0 0 0 4px rgba(255,45,85,0.08)',
  }

  const iconWrap: React.CSSProperties = {
    position: 'absolute', left: 15, top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex', alignItems: 'center',
    pointerEvents: 'none', transition: 'color 0.18s ease',
  }

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      background: '#F4F7FC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(20px, 4vw, 48px)',
    }}>
      {/* ── ambient canvas ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(at 12% 8%, rgba(26,115,232,0.09) 0px, transparent 48%),
          radial-gradient(at 88% 12%, rgba(124,58,237,0.08) 0px, transparent 48%),
          radial-gradient(at 78% 90%, rgba(0,200,83,0.07) 0px, transparent 46%),
          radial-gradient(at 20% 92%, rgba(245,130,32,0.07) 0px, transparent 46%),
          radial-gradient(at 50% 50%, rgba(245,130,32,0.03) 0px, transparent 60%)
        `,
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `
          linear-gradient(rgba(26,115,232,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(26,115,232,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse 90% 80% at 50% 40%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 40%, black 30%, transparent 75%)',
      }} />

      {/* ── card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease }}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 1060,
        }}
      >
        <div
          key={shake}
          className="login-card"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.06fr 1fr',
            borderRadius: 28,
            overflow: 'hidden',
            border: '1.5px solid rgba(255,255,255,0.7)',
            boxShadow: [
              '0 2px 8px rgba(15,23,42,0.04)',
              '0 30px 90px -30px rgba(15,23,42,0.28)',
              'inset 0 1px 0 rgba(255,255,255,0.9)',
            ].join(', '),
            animation: shake > 0 ? 'loginShake 0.42s ease-in-out' : 'none',
          }}
        >
        {/* ═══════════ LEFT · BRAND PANEL ═══════════ */}
        <div className="login-brand" style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          padding: 'clamp(28px, 4vw, 48px)',
          overflow: 'hidden',
          background: `
            radial-gradient(at 0% 0%, rgba(255,255,255,0.9) 0px, transparent 55%),
            radial-gradient(at 100% 100%, rgba(245,130,32,0.10) 0px, transparent 52%),
            linear-gradient(155deg, #FFFFFF 0%, #EEF3FB 100%)
          `,
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 190, height: 190, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,115,232,0.10) 0%, transparent 70%)',
          }} />

          <div style={{ position: 'relative' }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease }}>
              <Logo />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease }}
              style={{ marginTop: 'clamp(28px, 4vw, 44px)' }}
            >
              <div style={{ fontSize: 'clamp(26px, 3vw, 34px)', fontWeight: 800, color: C.ink, letterSpacing: '-1px', lineHeight: 1.15 }}>
                Know your share of
                <br />
                <span style={{
                  background: 'linear-gradient(100deg, #F58220 10%, #FF9F43 60%, #1A73E8 130%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  the conversation.
                </span>
              </div>
              <p style={{
                margin: '14px 0 0', maxWidth: 420,
                fontSize: 14, lineHeight: 1.7, color: C.text, fontWeight: 500,
              }}>
                Track every keyword, video and brand across YouTube — and see
                exactly where you stand against your competitors.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease }}
              style={{ marginTop: 'clamp(26px, 3.4vw, 40px)', maxWidth: 460 }}
            >
              <SovPreview />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{ marginTop: 28 }}
            >
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '1.2px',
                color: C.faint, textTransform: 'uppercase', marginBottom: 12,
              }}>
                Tracking for the teams behind
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BRAND_CHIPS.map(b => (
                  <span key={b} style={{
                    fontSize: 11, fontWeight: 700, color: C.muted,
                    padding: '6px 13px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.8)', border: '1.5px solid var(--border-1)',
                  }}>
                    {b}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ═══════════ RIGHT · FORM ═══════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(28px, 4vw, 48px)',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease }}
          >
            <div className="login-mobile-logo" style={{ display: 'none', marginBottom: 22 }}>
              <Logo />
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: C.orange, textTransform: 'uppercase', marginBottom: 10 }}>
              {step === 'email' ? 'Sign in' : 'Verify code'}
            </div>
            <h1 style={{
              fontSize: 'clamp(24px, 2.6vw, 30px)', fontWeight: 800, color: C.ink,
              letterSpacing: '-0.8px', lineHeight: 1.2, margin: 0,
            }}>
              {step === 'email' ? 'Welcome back' : 'Check your inbox'}
            </h1>
            <p style={{ fontSize: 13.5, color: C.muted, fontWeight: 500, margin: '8px 0 0' }}>
              {step === 'email'
                ? 'Enter your email to receive a login code.'
                : <>We sent a 6-digit code to <strong style={{ color: C.ink }}>{email}</strong></>
              }
            </p>
          </motion.div>

          {/* error banner */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease }}
                role="alert"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginTop: 22, padding: '12px 14px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #FEF2F2, #FFF5F3)',
                  border: '1.5px solid rgba(255,45,85,0.18)',
                  overflow: 'hidden',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: C.red }} />
                <div style={{ fontSize: 12.5, color: '#B91C1C', fontWeight: 600, lineHeight: 1.5 }}>
                  {serverError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 'email' ? (
              /* ══════════ STEP 1: EMAIL ══════════ */
              <motion.form
                key="email-form"
                ref={formRef}
                noValidate
                onSubmit={handleSendOTP}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 28 }}
              >
                <div>
                  <label htmlFor="login-email" style={{
                    display: 'block', fontSize: 12, fontWeight: 700, color: C.inkSoft,
                    marginBottom: 7,
                  }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ ...iconWrap, color: focused === 'email' ? C.orange : (fieldError.email ? C.red : C.faint) }}>
                      <Mail size={16} />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (fieldError.email) setFieldError(f => ({ ...f, email: undefined })) }}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                      placeholder="you@company.com"
                      aria-invalid={!!fieldError.email}
                      aria-describedby={fieldError.email ? 'email-error' : undefined}
                      style={{
                        ...fieldBase,
                        ...(focused === 'email' ? fieldFocused : {}),
                        ...(fieldError.email ? fieldErrorStyle : {}),
                      }}
                    />
                  </div>
                  {fieldError.email && (
                    <div id="email-error" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 11.5, color: '#D4304F', fontWeight: 600 }}>
                      <AlertCircle size={12} /> {fieldError.email}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      style={{
                        width: 17, height: 17, margin: 0, cursor: 'pointer', accentColor: C.orange,
                      }}
                    />
                    <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>Remember me</span>
                  </label>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 24px rgba(245,130,32,0.35)' } : {}}
                    whileTap={!loading ? { scale: 0.985 } : {}}
                    style={{
                      height: 48, padding: '0 26px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                      fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                      color: '#FFFFFF', border: 'none', borderRadius: 12,
                      background: 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
                      cursor: loading ? 'default' : 'pointer',
                      boxShadow: '0 4px 16px rgba(245,130,32,0.28)',
                      transition: 'all 0.2s ease',
                      minWidth: 128,
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send code
                        <ArrowRight size={15} />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.form>
            ) : (
              /* ══════════ STEP 2: OTP ══════════ */
              <motion.form
                key="otp-form"
                noValidate
                onSubmit={handleVerifyOTP}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 28 }}
              >
                <div>
                  <label style={{
                    display: 'block', fontSize: 12, fontWeight: 700, color: C.inkSoft,
                    marginBottom: 12, textAlign: 'center',
                  }}>
                    Enter 6-digit code
                  </label>
                  <OTPInput
                    value={otpValue}
                    onChange={v => { setOtpValue(v); if (fieldError.otp) setFieldError(f => ({ ...f, otp: undefined })) }}
                    autoFocus
                  />
                  {fieldError.otp && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, fontSize: 11.5, color: '#D4304F', fontWeight: 600 }}>
                      <AlertCircle size={12} /> {fieldError.otp}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      height: 48, padding: '0 16px',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                      color: C.muted, background: 'transparent',
                      border: '1.5px solid var(--border-1)', borderRadius: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>

                  <motion.button
                    type="submit"
                    disabled={loading || success}
                    whileHover={!loading && !success ? { scale: 1.015, boxShadow: '0 8px 24px rgba(245,130,32,0.35)' } : {}}
                    whileTap={!loading && !success ? { scale: 0.985 } : {}}
                    style={{
                      height: 48, padding: '0 26px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                      fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                      color: '#FFFFFF', border: 'none', borderRadius: 12,
                      background: success
                        ? 'linear-gradient(135deg, #00C853 0%, #2ECC71 100%)'
                        : 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
                      cursor: loading || success ? 'default' : 'pointer',
                      boxShadow: success
                        ? '0 8px 24px rgba(0,200,83,0.3)'
                        : '0 4px 16px rgba(245,130,32,0.28)',
                      transition: 'all 0.2s ease',
                      minWidth: 128,
                    }}
                  >
                    {success ? (
                      <>
                        <Check size={17} />
                        Verified
                      </>
                    ) : loading ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify
                        <ArrowRight size={15} />
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Resend link */}
                <div style={{ textAlign: 'center' }}>
                  {resendCountdown > 0 ? (
                    <span style={{ fontSize: 12.5, color: C.faint, fontWeight: 600 }}>
                      Resend code in {resendCountdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 12.5, color: C.orange, fontWeight: 700,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', padding: 0,
                      }}
                    >
                      <RefreshCw size={13} />
                      Resend code
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            style={{
              marginTop: 'clamp(24px, 3vw, 34px)',
              paddingTop: 20, borderTop: '1.5px solid var(--border-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: C.faint, fontWeight: 600 }}>
              <ShieldCheck size={13} color={C.green} />
              Secured · encrypted session
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.faint, fontWeight: 600 }}>
              Powered by
              <span style={{ fontWeight: 800, color: C.orange }}>TheBoredMonkey</span>
            </div>
          </motion.div>
        </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loginShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-9px); }
          30% { transform: translateX(9px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes sovPulse {
          0%   { box-shadow: 0 0 0 0 rgba(0,200,83,0.45); }
          70%  { box-shadow: 0 0 0 6px rgba(0,200,83,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); }
        }
        @media (max-width: 920px) {
          .login-card { grid-template-columns: 1fr; max-width: 480px; }
          .login-brand { display: none; }
          .login-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
