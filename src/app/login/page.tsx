'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      if (data.session?.role === 'client') {
        router.push('/client')
      } else {
        router.push('/campaigns')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      background: '#FFFFFF',
      zIndex: 9999,
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 440px',
        background: 'linear-gradient(160deg, #172B4D 0%, #091E42 60%, #0C1A2E 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 44px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative dots grid */}
        <div style={{
          position: 'absolute',
          top: 36,
          right: 36,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 5px)',
          gap: 8,
          opacity: 0.12,
        }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFF' }} />
          ))}
        </div>

        {/* Decorative arc */}
        <div style={{
          position: 'absolute',
          bottom: -120,
          right: -80,
          width: 280,
          height: 280,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -80,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.04)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 36,
            boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
          }}>
            <span style={{ color: '#FFF', fontWeight: 800, fontSize: 19 }}>C</span>
          </div>

          <h1 style={{
            fontSize: 30,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.15,
            marginBottom: 14,
            letterSpacing: '-0.5px',
          }}>
            Campaign Panel
          </h1>

          <p style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.65,
            maxWidth: 340,
            marginBottom: 44,
          }}>
            Enterprise influencer campaign management — track workflows, creator performance, and live analytics.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              '6-stage campaign lifecycle tracking',
              'Real-time creator performance analytics',
              'SLA monitoring & automated alerts',
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(37,99,235,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA' }} />
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding */}
        <div style={{
          position: 'absolute',
          bottom: 28,
          left: 44,
          fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
          fontWeight: 500,
          letterSpacing: '0.2px',
        }}>
          by TheBoredMonkey
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: '#FFFFFF',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }} className="mobile-logo">
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
            }}>
              <span style={{ color: '#FFF', fontWeight: 800, fontSize: 19 }}>C</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-bright)' }}>
              Campaign Panel
            </h1>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-bright)',
              marginBottom: 6,
              letterSpacing: '-0.3px',
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1.5px solid var(--border-1)',
                  background: 'var(--bg-input)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--blue)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--blue-ring)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border-1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    paddingRight: 40,
                    borderRadius: 'var(--radius)',
                    border: '1.5px solid var(--border-1)',
                    background: 'var(--bg-input)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--blue)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--blue-ring)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border-1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 2,
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                background: 'var(--red-dim)',
                border: '1px solid rgba(220,38,38,0.12)',
                color: 'var(--red)',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 18,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px 20px',
                borderRadius: 'var(--radius)',
                border: 'none',
                background: loading ? 'var(--blue-dim)' : 'var(--blue)',
                color: '#FFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ArrowRight size={15} />
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: '1px solid var(--border-1)',
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            Contact your administrator for access
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-logo { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}
