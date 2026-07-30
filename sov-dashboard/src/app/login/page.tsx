'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, BarChart3, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const BRANDS = [
  { text: 'atomberg', top: '8%',  left: '5%',  rotate: -12, size: 40, dur: 22, delay: 0 },
  { text: 'boAt',     top: '22%', left: '70%', rotate: 8,   size: 31, dur: 25, delay: 2,   underline: '#E53935' },
  { text: 'wakefit',  top: '35%', left: '10%', rotate: -5,  size: 36, dur: 20, delay: 4,   underline: '#F58220' },
  { text: 'Belong',   top: '65%', left: '60%', rotate: 12,  size: 33, dur: 28, delay: 1 },
  { text: 'Shoonya',  top: '45%', left: '80%', rotate: -8,  size: 38, dur: 24, delay: 3 },
  { text: 'GoPlanet', top: '80%', left: '8%',  rotate: 6,   size: 40, dur: 26, delay: 5 },
  { text: 'Lotte',    top: '5%',  left: '50%', rotate: -3,  size: 29, dur: 21, delay: 2.5, underline: '#E53935' },
  { text: 'Noise',    top: '58%', left: '5%',  rotate: 10,  size: 29, dur: 23, delay: 1.5, underline: '#F58220' },
  { text: 'Setu',     top: '30%', left: '45%', rotate: 4,   size: 24, dur: 19, delay: 3.5 },
  { text: 'PhonePe',  top: '15%', left: '30%', rotate: -6,  size: 40, dur: 30, delay: 4.5, underline: '#5F259F' },
  { text: 'Zepto',    top: '72%', left: '78%', rotate: 7,   size: 29, dur: 22, delay: 2 },
  { text: 'AJIO',     top: '88%', left: '68%', rotate: -4,  size: 24, dur: 25, delay: 7 },
]

const FEATURES = [
  { icon: BarChart3, text: 'Track brand visibility across platforms' },
  { icon: Zap,       text: 'Real-time SOV analytics & alerts' },
  { icon: Shield,    text: 'Competitive intelligence dashboard' },
]

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function FloatingBrands() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {BRANDS.map((b) => (
        <div
          key={b.text}
          className="brand-watermark absolute opacity-[0.07]"
          style={{
            top: b.top,
            left: b.left,
            transform: `rotate(${b.rotate}deg)`,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <div
            className="whitespace-nowrap font-black leading-none tracking-tight text-white"
            style={{ fontSize: b.size, fontFamily: '"Arial Black", Arial, Helvetica, sans-serif' }}
          >
            {b.text}
          </div>
          {b.underline && (
            <div className="mt-0.5 h-[3px] w-3/5 rounded-sm opacity-70" style={{ background: b.underline }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
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

  const fieldBase =
    'w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 text-sm text-slate-900 ' +
    'placeholder:text-slate-400 transition-colors duration-200 ' +
    'hover:border-slate-300 ' +
    'focus:border-[#F58220] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#F58220]/12 ' +
    'disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div className="fixed inset-0 flex overflow-y-auto bg-white">
      <style>{`
        @keyframes watermarkFloat {
          0%, 100% { transform: translateY(0) }
          50%      { transform: translateY(-14px) }
        }
        .brand-watermark { animation-name: watermarkFloat; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @media (prefers-reduced-motion: reduce) {
          .brand-watermark { animation: none !important }
        }
      `}</style>

      {/* ── Brand panel ───────────────────────────────────────────────── */}
      <aside className="relative hidden flex-1 flex-col justify-center overflow-hidden bg-slate-900 px-14 lg:flex">
        {/* one soft, static glow instead of several drifting orbs */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 80% at 20% 0%, rgba(245,130,32,0.16) 0%, transparent 60%)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <FloatingBrands />

        <motion.div initial="hidden" animate="visible" variants={container} className="relative z-10 max-w-lg">
          <motion.div variants={item} className="inline-flex rounded-2xl bg-white/95 px-7 py-4 shadow-lg shadow-black/20">
            <img src="/tbm-logo.png" alt="TheBoredMonkey" className="h-14 w-auto" />
          </motion.div>

          <motion.h1 variants={item} className="mt-9 text-3xl font-semibold leading-snug tracking-tight text-white">
            Your command center for brand intelligence
          </motion.h1>

          <motion.ul variants={item} className="mt-10 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/15 text-[#F58220]">
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <span className="text-sm font-medium text-slate-200">{text}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </aside>

      {/* ── Form panel ────────────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={container}
          className="w-full max-w-[400px] rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)] sm:p-10"
        >
          {/* logo repeats here for the mobile layout, where the brand panel is hidden */}
          <motion.div variants={item} className="mb-9 flex justify-center lg:hidden">
            <img src="/tbm-logo.png" alt="TheBoredMonkey" className="h-11 w-auto" />
          </motion.div>

          <motion.div variants={item}>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to your analytics workspace</p>
          </motion.div>

          <motion.form variants={item} onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                  className={fieldBase}
                />
              </div>
            </div>

            <div>
              <label htmlFor={passwordId} className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                  className={`${fieldBase} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                id={errorId}
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
              >
                <AlertCircle size={16} className="mt-px shrink-0 text-red-500" aria-hidden />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 cursor-pointer rounded border-slate-300 accent-[#F58220] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F58220] focus-visible:ring-offset-2"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#E0741A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F58220]/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </>
              )}
            </button>
          </motion.form>

          <motion.p variants={item} className="mt-8 text-center text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-500">TheBoredMonkey</span>
          </motion.p>
        </motion.div>
      </main>
    </div>
  )
}
