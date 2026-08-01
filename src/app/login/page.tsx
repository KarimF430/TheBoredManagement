'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight,
  ShieldCheck, Check,
} from 'lucide-react'

/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS — aligned with the app's bright glassmorphic suite
   ════════════════════════════════════════════════════════════ */
const C = {
  ink:       '#0F172A',
  inkSoft:   '#1E293B',
  text:      '#475569',
  muted:     '#64748B',
  faint:     '#94A3B8',
  line:      'rgba(26,115,232,0.10)',
  lineSoft:  'rgba(26,115,232,0.06)',
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

const ease = [0.16, 1, 0.3, 1] as const

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

/* Live SOV preview — animated bar comparison shown on the brand panel */
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
      {/* header */}
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

      {/* bars */}
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

      {/* footer stats */}
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
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [remember, setRemember] = useState(false)
  const [focused, setFocused] = useState<'email' | 'password' | null>(null)

  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  /* prefill remembered email — deferred so it never runs during render/hydration */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('sov_remember_email')
        if (saved) { setEmail(saved); setRemember(true) }
      } catch {}
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) errs.email = 'Enter your email address'
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'That email doesn’t look right'
    if (!password) errs.password = 'Enter your password'
    setFieldError(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate')

      if (remember) {
        try { localStorage.setItem('sov_remember_email', email.trim()) } catch {}
      } else {
        try { localStorage.removeItem('sov_remember_email') } catch {}
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/workspace')
        router.refresh()
      }, 900)
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setShake(s => s + 1)
    } finally {
      setLoading(false)
    }
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
          {/* floating accent shapes */}
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
              Sign in
            </div>
            <h1 style={{
              fontSize: 'clamp(24px, 2.6vw, 30px)', fontWeight: 800, color: C.ink,
              letterSpacing: '-0.8px', lineHeight: 1.2, margin: 0,
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13.5, color: C.muted, fontWeight: 500, margin: '8px 0 0' }}>
              Sign in to your analytics workspace to continue.
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

          <motion.form
            ref={formRef}
            noValidate
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 28 }}
          >
            {/* email */}
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

            {/* password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <label htmlFor="login-password" style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>
                  Password
                </label>
                <a
                  href="mailto:Haji.karim@theboredmonkey.com?subject=SOV%20Panel%20—%20Sign-in%20issue"
                  style={{ fontSize: 11.5, color: C.faint, fontWeight: 700, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.orange }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.faint }}
                >
                  Trouble signing in?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ ...iconWrap, color: focused === 'password' ? C.orange : (fieldError.password ? C.red : C.faint) }}>
                  <Lock size={16} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    const mod = (e.nativeEvent as unknown as { getModifierState?: (k: string) => boolean })
                    if (mod.getModifierState) setCapsLock(mod.getModifierState('CapsLock'))
                    if (fieldError.password) setFieldError(f => ({ ...f, password: undefined }))
                  }}
                  onFocus={() => { setFocused('password') }}
                  onBlur={() => { setFocused(null); setCapsLock(false) }}
                  onKeyDown={e => { if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock')) }}
                  placeholder="••••••••"
                  aria-invalid={!!fieldError.password}
                  aria-describedby={fieldError.password ? 'password-error' : undefined}
                  style={{
                    ...fieldBase,
                    paddingRight: 46,
                    ...(focused === 'password' ? fieldFocused : {}),
                    ...(fieldError.password ? fieldErrorStyle : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 9,
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: C.faint, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.blueDim; e.currentTarget.style.color = C.inkSoft }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.faint }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* caps lock + error row */}
              <div style={{ minHeight: 20, marginTop: 7 }}>
                {fieldError.password ? (
                  <div id="password-error" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#D4304F', fontWeight: 600 }}>
                    <AlertCircle size={12} /> {fieldError.password}
                  </div>
                ) : capsLock ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#B45309', fontWeight: 600 }}>
                    <AlertCircle size={12} /> Caps Lock is on
                  </div>
                ) : null}
              </div>
            </div>

            {/* remember + submit */}
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
                  position: 'relative', overflow: 'hidden',
                  minWidth: 128,
                }}
              >
                {success ? (
                  <>
                    <Check size={17} />
                    Success
                  </>
                ) : loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>

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
