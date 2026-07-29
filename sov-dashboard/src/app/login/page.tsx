'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, User, BarChart3, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const BRANDS = [
  { text: 'atomberg', top: '8%', left: '5%', rotate: '-12deg', w: 180, color: '#FFFFFF', delay: 0, dur: 22 },
  { text: 'boAt', top: '22%', left: '70%', rotate: '8deg', w: 140, color: '#FFFFFF', delay: 2, dur: 25, underline: '#E53935' },
  { text: 'wakefit', top: '35%', left: '10%', rotate: '-5deg', w: 160, color: '#FFFFFF', delay: 4, dur: 20, underline: '#F58220' },
  { text: 'Belong', top: '65%', left: '60%', rotate: '12deg', w: 150, color: '#FFFFFF', delay: 1, dur: 28 },
  { text: 'Shoonya', top: '45%', left: '80%', rotate: '-8deg', w: 170, color: '#FFFFFF', delay: 3, dur: 24 },
  { text: 'GoPlanet', top: '80%', left: '8%', rotate: '6deg', w: 180, color: '#FFFFFF', delay: 5, dur: 26 },
  { text: 'Lotte', top: '5%', left: '50%', rotate: '-3deg', w: 130, color: '#FFFFFF', delay: 2.5, dur: 21, underline: '#E53935' },
  { text: 'Noise', top: '58%', left: '5%', rotate: '10deg', w: 130, color: '#FFFFFF', delay: 1.5, dur: 23, underline: '#F58220' },
  { text: 'Setu', top: '30%', left: '45%', rotate: '4deg', w: 110, color: '#FFFFFF', delay: 3.5, dur: 19 },
  { text: 'PhonePe', top: '15%', left: '30%', rotate: '-6deg', w: 180, color: '#FFFFFF', delay: 4.5, dur: 30, underline: '#5F259F' },
  { text: 'Zepto', top: '72%', left: '78%', rotate: '7deg', w: 130, color: '#FFFFFF', delay: 2, dur: 22 },
  { text: 'AJIO', top: '88%', left: '68%', rotate: '-4deg', w: 110, color: '#FF6B6B', delay: 7, dur: 25 },
]

const FEATURES = [
  { icon: BarChart3, text: 'Track brand visibility across platforms' },
  { icon: Zap, text: 'Real-time SOV analytics & alerts' },
  { icon: Shield, text: 'Competitive intelligence dashboard' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function FloatingBrands() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {BRANDS.map((b, i) => (
        <div
          key={i}
          className="brand-watermark"
          style={{
            position: 'absolute',
            top: b.top,
            left: b.left,
            transform: `rotate(${b.rotate})`,
            opacity: 0.1,
            animation: `watermarkFloat ${b.dur}s ease-in-out ${b.delay}s infinite`,
          }}
        >
          <div style={{
            fontSize: Math.round(b.w / 4.5),
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
            color: b.color,
            letterSpacing: '-1px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>
            {b.text}
          </div>
          {b.underline && (
            <div style={{
              height: 3,
              width: '60%',
              borderRadius: 2,
              background: b.underline,
              marginTop: 2,
              opacity: 0.7,
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Logo({ h }: { h: number }) {
  return (
    <div style={{
      filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.15))',
      display: 'inline-block',
    }}>
      <img
        src="/tbm-logo.png"
        alt="TheBoredMonkey"
        style={{ height: h, width: 'auto', display: 'block' }}
      />
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate')
      router.push('/workspace')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field: 'email' | 'password') => ({
    width: '100%',
    height: 46,
    paddingLeft: 42,
    paddingRight: field === 'password' ? 42 : 14,
    fontSize: 13.5,
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    border: '1.5px solid',
    borderColor: focusedField === field ? '#F58220' : 'rgba(26,115,232,0.1)',
    borderRadius: 12,
    background: focusedField === field ? '#FFFFFF' : '#F8FAFC',
    outline: 'none',
    transition: 'all 0.25s ease',
    boxShadow: focusedField === field
      ? '0 0 0 4px rgba(245,130,32,0.08), 0 2px 8px rgba(0,0,0,0.04)'
      : '0 1px 3px rgba(0,0,0,0.02)',
    color: '#0F172A',
  })

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      overflow: 'hidden',
      background: '#F0F2F5',
    }}>
      {/* ===== LEFT PANEL: BRANDING ===== */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        style={{
          position: 'relative',
          flex: 1,
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 48px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #334155 100%)',
        }}
        className="login-left-panel"
      >
        {/* Animated gradient orbs */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,130,32,0.15) 0%, transparent 70%)',
          animation: 'loginDrift 20s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-5%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,115,232,0.12) 0%, transparent 70%)',
          animation: 'loginDrift2 25s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '55%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          animation: 'loginDrift3 18s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Floating brand names */}
        <FloatingBrands />

        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Brand content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            maxWidth: 420,
          }}
        >
          <motion.div variants={itemVariants} style={{ marginBottom: 28 }}>
            <Logo h={64} />
          </motion.div>

          <motion.h1 variants={itemVariants} style={{
            fontSize: 36,
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
          }}>
            TheBoredMonkey
          </motion.h1>

          <motion.p variants={itemVariants} style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.55)',
            margin: '0 0 48px',
            fontWeight: 400,
            lineHeight: 1.5,
          }}>
            Your command center for brand intelligence
          </motion.p>

          {/* Feature highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(245,130,32,0.2), rgba(245,130,32,0.05))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <feat.icon size={20} style={{ color: '#F58220' }} />
                </div>
                <span style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 500,
                  textAlign: 'left',
                }}>
                  {feat.text}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ===== RIGHT PANEL: LOGIN FORM ===== */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background accents for right panel */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,130,32,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-5%',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,115,232,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Login Card */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: 420,
            background: '#FFFFFF',
            borderRadius: 24,
            padding: '40px 36px 32px',
            boxShadow: [
              '0 1px 3px rgba(0,0,0,0.04)',
              '0 4px 12px rgba(0,0,0,0.03)',
              '0 16px 48px -12px rgba(0,0,0,0.06)',
              'inset 0 1px 0 rgba(255,255,255,0.8)',
            ].join(', '),
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: 3,
            borderRadius: '0 0 4px 4px',
            background: 'linear-gradient(90deg, transparent, #F58220, transparent)',
          }} />

          {/* Header */}
          <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #F58220, #FF9F43)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 4px 16px rgba(245,130,32,0.25)',
            }}>
              <User size={26} style={{ color: '#FFFFFF' }} />
            </div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 6px',
              letterSpacing: '-0.3px',
            }}>
              Welcome back
            </h1>
            <p style={{
              fontSize: 13.5,
              color: '#94A3B8',
              margin: 0,
              fontWeight: 400,
            }}>
              Sign in to your analytics workspace
            </p>
          </motion.div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: 'flex',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #FEF2F2, #FFF5F5)',
                border: '1px solid rgba(255,45,85,0.12)',
                color: '#B91C1C',
                fontSize: 12.5,
                fontWeight: 500,
                marginBottom: 20,
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <motion.form
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            {/* Email */}
            <motion.div variants={itemVariants}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.8px',
                marginBottom: 8,
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'email' ? '#F58220' : '#94A3B8',
                  pointerEvents: 'none',
                  transition: 'color 0.25s ease',
                  zIndex: 1,
                }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@company.com"
                  style={inputStyle('email')}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={itemVariants}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.8px',
                marginBottom: 8,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'password' ? '#F58220' : '#94A3B8',
                  pointerEvents: 'none',
                  transition: 'color 0.25s ease',
                  zIndex: 1,
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  style={inputStyle('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            {/* Remember me + Forgot password */}
            <motion.div variants={itemVariants} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: -2,
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: '#64748B',
                fontWeight: 500,
                userSelect: 'none',
              }}>
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${rememberMe ? '#F58220' : 'rgba(26,115,232,0.2)'}`,
                    background: rememberMe ? 'linear-gradient(135deg, #F58220, #FF9F43)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                Remember me
              </label>
              <a
                href="#"
                onClick={e => e.preventDefault()}
                style={{
                  fontSize: 13,
                  color: '#F58220',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
              >
                Forgot password?
              </a>
            </motion.div>

            {/* Sign In Button */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.015 }}
                whileTap={{ scale: loading ? 1 : 0.985 }}
                style={{
                  width: '100%',
                  height: 48,
                  fontSize: 14,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.85 : 1,
                  boxShadow: loading
                    ? 'none'
                    : '0 4px 16px rgba(245,130,32,0.3), 0 1px 3px rgba(245,130,32,0.15)',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} style={{ transition: 'transform 0.2s ease' }} />
                    {/* Shine sweep */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '60%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                      animation: 'loginShine 3s ease-in-out infinite',
                    }} />
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.form>

          {/* Footer */}
          <motion.div variants={itemVariants} style={{
            marginTop: 28,
            textAlign: 'center',
            fontSize: 12,
            color: '#CBD5E1',
            fontWeight: 500,
            lineHeight: 1.5,
          }}>
            Powered by{' '}
            <span style={{ fontWeight: 700, color: '#F58220' }}>TheBoredMonkey</span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ===== RESPONSIVE: mobile stack ===== */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loginShine {
          0%, 100% { left: -100%; }
          50% { left: 200%; }
        }
        @keyframes loginDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 40px) scale(0.95); }
        }
        @keyframes loginDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.08); }
          66% { transform: translate(30px, -40px) scale(0.92); }
        }
        @keyframes loginDrift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 30px) scale(1.03); }
        }
        @keyframes watermarkFloat {
          0%, 100% { transform: translateY(0) rotate(inherit); }
          50% { transform: translateY(-14px) rotate(inherit); }
        }
        .brand-watermark { cursor: default; }
        input::placeholder {
          color: #CBD5E1;
          font-weight: 400;
        }
        input:focus::placeholder {
          color: #E2E8F0;
        }
        @media (max-width: 900px) {
          .login-left-panel {
            display: none !important;
          }
        }
        @media (min-width: 901px) {
          .login-left-panel {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  )
}
