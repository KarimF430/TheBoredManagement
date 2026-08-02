'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, Loader2, ArrowRight, Check, Eye, EyeOff,
} from 'lucide-react'

/* ════════════════════════════════════════════════════════════
   SOV PANEL · LOGIN — clean, minimal, centered (Jira-style)
   ════════════════════════════════════════════════════════════ */

const C = {
  orange:    'var(--brand-amazon)',
  orangeHov: '#E6781C',
  blue:      'var(--accent)',
  text:      'var(--text-bright)',
  textSec:   'var(--text-secondary)',
  muted:     'var(--text-secondary)',
  faint:     'var(--text-muted)',
  border:    'var(--border-medium)',
  borderFoc: 'var(--accent)',
  bg:        'var(--bg-base)',
  red:       'var(--danger)',
  redDim:    'var(--danger-dim)',
  green:     'var(--success-text)',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [remember, setRemember] = useState(false)

  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter a valid email address'
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
      }, 800)
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    height: 40,
    padding: '0 12px',
    fontSize: 'var(--fs-body)',
    fontFamily: 'inherit',
    color: C.text,
    background: 'var(--surface)',
    border: `2px solid ${hasError ? C.red : C.border}`,
    borderRadius: 'var(--radius-xs)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box' as const,
  })

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: C.bg,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      padding: '24px 16px',
    }}>
      {/* logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 28, display: 'flex', justifyContent: 'center' }}
      >
        <img
          src="/tbm-logo.png"
          alt="TheBoredMonkey"
          style={{ height: 36, width: 'auto', display: 'block' }}
        />
      </motion.div>

      {/* card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface)',
          border: `1px solid ${C.border}`,
          borderRadius: 'var(--radius-xs)',
          boxShadow: '0 1px 1px rgba(9,30,66,0.08), 0 0 1px 1px rgba(9,30,66,0.04)',
          padding: '32px 32px 20px',
        }}
      >
        {/* heading */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontSize: 'var(--fs-h1)', fontWeight: 600, color: C.text,
            margin: 0, letterSpacing: '-0.2px',
          }}>
            Log in to your account
          </h1>
          <p style={{ fontSize: 'var(--fs-body)', color: C.muted, margin: '6px 0 0', fontWeight: 400 }}>
            SOV Panel · Share of Voice analytics
          </p>
        </div>

        {/* server error */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              role="alert"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', marginBottom: 16,
                background: C.redDim, border: `2px solid ${C.red}`,
                borderRadius: 'var(--radius-xs)', overflow: 'hidden',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1, color: C.red }} />
              <div style={{ fontSize: 'var(--fs-body)', color: C.text, fontWeight: 500, lineHeight: 1.5 }}>
                {serverError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* email */}
          <div>
            <label htmlFor="login-email" style={{
              display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, color: C.textSec, marginBottom: 6,
            }}>
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                if (fieldError.email) setFieldError(f => ({ ...f, email: undefined }))
              }}
              placeholder="you@company.com"
              aria-invalid={!!fieldError.email}
              style={inputStyle(!!fieldError.email)}
              onFocus={e => { e.currentTarget.style.borderColor = fieldError.email ? C.red : C.borderFoc }}
              onBlur={e => { e.currentTarget.style.borderColor = fieldError.email ? C.red : C.border }}
            />
            {fieldError.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 'var(--fs-sm)', color: C.red, fontWeight: 500 }}>
                <AlertCircle size={12} /> {fieldError.email}
              </div>
            )}
          </div>

          {/* password */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label htmlFor="login-password" style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: C.textSec }}>
                Password
              </label>
              <a
                href="mailto:Haji.karim@theboredmonkey.com?subject=SOV%20Panel%20—%20Sign-in%20issue"
                style={{ fontSize: 'var(--fs-sm)', color: C.blue, fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
              >
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
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
                onFocus={e => {
                  e.currentTarget.style.borderColor = fieldError.password ? C.red : C.borderFoc
                  e.currentTarget.style.boxShadow = fieldError.password ? '0 0 0 1px rgba(222,53,11,0.35)' : '0 0 0 1px rgba(76,154,255,0.35)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = fieldError.password ? C.red : C.border
                  e.currentTarget.style.boxShadow = 'none'
                  setCapsLock(false)
                }}
                onKeyDown={e => { if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock')) }}
                placeholder="Enter your password"
                aria-invalid={!!fieldError.password}
                style={{ ...inputStyle(!!fieldError.password), paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 8, top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 'var(--radius-xs)',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: C.faint, transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.textSec }}
                onMouseLeave={e => { e.currentTarget.style.color = C.faint }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div style={{ minHeight: 18, marginTop: 6 }}>
              {fieldError.password ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', color: C.red, fontWeight: 500 }}>
                  <AlertCircle size={12} /> {fieldError.password}
                </div>
              ) : capsLock ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', color: 'var(--warning-text)', fontWeight: 500 }}>
                  <AlertCircle size={12} /> Caps Lock is on
                </div>
              ) : null}
            </div>
          </div>

          {/* remember me */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: 15, height: 15, margin: 0, cursor: 'pointer', accentColor: C.orange }}
            />
            <span style={{ fontSize: 'var(--fs-body)', color: C.textSec, fontWeight: 500 }}>Remember me</span>
          </label>

          {/* submit */}
          <motion.button
            type="submit"
            disabled={loading || success}
            whileHover={!loading && !success ? { backgroundColor: C.orangeHov } : {}}
            whileTap={!loading && !success ? { scale: 0.99 } : {}}
            style={{
              width: '100%',
              height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', fontSize: 'var(--fs-body)', fontWeight: 600,
              color: 'var(--surface)', border: 'none', borderRadius: 'var(--radius-xs)',
              background: success ? C.green : C.orange,
              cursor: loading || success ? 'default' : 'pointer',
              transition: 'background-color 0.15s ease',
              marginTop: 4,
            }}
          >
            {success ? (
              <>
                <Check size={16} /> Logged in
              </>
            ) : loading ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 0.9s linear infinite' }} />
                Logging in…
              </>
            ) : (
              <>
                Log in
                <ArrowRight size={15} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          marginTop: 24,
          display: 'flex', alignItems: 'center', gap: 18,
          fontSize: 'var(--fs-sm)', color: C.muted, fontWeight: 500,
        }}
      >
        <a
          href="/privacy-policy"
          style={{ color: C.muted, textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.color = C.blue }}
          onMouseLeave={e => { e.currentTarget.style.color = C.muted }}
        >
          Privacy Policy
        </a>
        <span style={{ width: 1, height: 12, background: C.border }} />
        <span>
          Powered by{' '}
          <span style={{ fontWeight: 700, color: C.textSec }}>TheBoredMonkey</span>
        </span>
      </motion.div>

    </div>
  )
}
