'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X, ChevronLeft, Sparkles, Zap, Hand, DollarSign, Shield } from 'lucide-react'
import AutoAdvanceButton from '@/components/creator-onboarding/AutoAdvanceButton'
import ProgressCue from '@/components/creator-onboarding/ProgressCue'
import BinarySwipeCard from '@/components/creator-onboarding/BinarySwipeCard'
import RateChip from '@/components/creator-onboarding/RateChip'
import NicheSelector from '@/components/creator-onboarding/NicheSelector'

interface Session {
  id: string
  token: string
  creator_email: string
  current_step: number
  completed_steps: number[]
}

interface NicheData {
  niche_name: string
  icon: string
  sub_niches: string[]
  content_types: string[]
}

interface FormData {
  consent: boolean
  name: string
  handle: string
  primary_niche: string | null
  secondary_niches: string[]
  sub_niches: string[]
  content_types: string[]
  posts_per_week: string
  has_brand_deals: string
  audience_age: string
  content_language: string
  monetization: string
  wants_paid: string
  open_to_long_term: string
  open_exclusivity: string
  wants_gifting: string
  content_style: string[]
  preferred_platforms: string[]
  rate_youtube_long: number
  rate_youtube_shorts: number
  rate_instagram_reel: number
  rate_instagram_post: number
  rates_deferred: boolean
}

const SCREENS = [
  { id: 'identity', label: 'Identity' },
  { id: 'niche', label: 'Niche' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'cluster', label: 'Cluster' },
  { id: 'willingness', label: 'Willingness' },
  { id: 'rates', label: 'Rates' },
]

const BEHAVIORAL_QUESTIONS = [
  { key: 'posts_per_week' as const, question: 'How often do you post new content?', options: [
    { value: 'daily', label: 'Daily', icon: <Zap className="w-4 h-4" /> },
    { value: '3-4_week', label: '3-4 times a week', icon: <Zap className="w-4 h-4" /> },
    { value: '1-2_week', label: '1-2 times a week', icon: <Zap className="w-4 h-4" /> },
    { value: 'weekly', label: 'Weekly', icon: <Zap className="w-4 h-4" /> },
    { value: 'less', label: 'Less often', icon: <Zap className="w-4 h-4" /> },
  ]},
  { key: 'has_brand_deals' as const, question: 'Have you worked with brands before?', options: [
    { value: 'yes_multiple', label: 'Yes, multiple times', icon: <Hand className="w-4 h-4" /> },
    { value: 'yes_once', label: 'Yes, once or twice', icon: <Hand className="w-4 h-4" /> },
    { value: 'no', label: 'No, but interested', icon: <Hand className="w-4 h-4" /> },
  ]},
  { key: 'audience_age' as const, question: 'What age group is your audience mainly?', options: [
    { value: '13-17', label: '13-17 (Gen Z)', icon: <Sparkles className="w-4 h-4" /> },
    { value: '18-24', label: '18-24', icon: <Sparkles className="w-4 h-4" /> },
    { value: '25-34', label: '25-34', icon: <Sparkles className="w-4 h-4" /> },
    { value: '35+', label: '35+', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'mixed', label: 'Mixed / Don\'t know', icon: <Sparkles className="w-4 h-4" /> },
  ]},
  { key: 'content_language' as const, question: 'What language do you primarily create in?', options: [
    { value: 'hindi', label: 'Hindi', icon: null },
    { value: 'english', label: 'English', icon: null },
    { value: 'hinglish', label: 'Hinglish (mix)', icon: null },
    { value: 'tamil', label: 'Tamil', icon: null },
    { value: 'telugu', label: 'Telugu', icon: null },
    { value: 'other', label: 'Other regional', icon: null },
  ]},
  { key: 'monetization' as const, question: 'How do you currently earn from content?', options: [
    { value: 'yt_ads', label: 'YouTube ad revenue', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'brand_deals', label: 'Brand deals', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'affiliate', label: 'Affiliate marketing', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'none', label: 'Not earning yet', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'multiple', label: 'Multiple sources', icon: <DollarSign className="w-4 h-4" /> },
  ]},
]

const WILLINGNESS_QUESTIONS = [
  { key: 'wants_paid' as const, question: 'Would you be open to paid brand collaborations?', yesLabel: 'Yes', noLabel: 'Not now' },
  { key: 'open_to_long_term' as const, question: 'Open to long-term brand partnerships (3+ months)?', yesLabel: 'Open to it', noLabel: 'Prefer one-off' },
  { key: 'open_exclusivity' as const, question: 'Comfortable with category exclusivity for a campaign?', yesLabel: 'Yes', noLabel: 'Prefer not' },
  { key: 'wants_gifting' as const, question: 'Interested in product gifting in exchange for content?', yesLabel: 'Yes!', noLabel: 'Prefer paid only' },
]

export default function OnboardingStepsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [session, setSession] = useState<Session | null>(null)
  const [currentScreen, setCurrentScreen] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [niches, setNiches] = useState<NicheData[]>([])
  const [nicheConfidence, setNicheConfidence] = useState(0)
  const [willingnessIdx, setWillingnessIdx] = useState(0)

  const [formData, setFormData] = useState<FormData>({
    consent: false,
    name: '',
    handle: '',
    primary_niche: null,
    secondary_niches: [],
    sub_niches: [],
    content_types: [],
    posts_per_week: '',
    has_brand_deals: '',
    audience_age: '',
    content_language: '',
    monetization: '',
    wants_paid: '',
    open_to_long_term: '',
    open_exclusivity: '',
    wants_gifting: '',
    content_style: [],
    preferred_platforms: [],
    rate_youtube_long: 0,
    rate_youtube_shorts: 0,
    rate_instagram_reel: 0,
    rate_instagram_post: 0,
    rates_deferred: false,
  })

  useEffect(() => {
    if (!token) {
      router.push('/creator-onboarding')
      return
    }

    const fetchData = async () => {
      try {
        const [sessionRes, nichesRes] = await Promise.all([
          fetch(`/api/creator-onboarding/session?token=${token}`),
          fetch('/api/creator-onboarding/niches'),
        ])

        const sessionData = await sessionRes.json()
        const nichesData = await nichesRes.json()

        if (!sessionRes.ok || !sessionData.session) {
          router.push('/creator-onboarding')
          return
        }

        if (sessionData.session.status === 'completed') {
          router.push(`/creator-onboarding/${token}/success`)
          return
        }

        setSession(sessionData.session)
        setNiches(nichesData.niches || [])

        // Restore from localStorage if available
        const saved = localStorage.getItem(`onboarding_${token}`)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setFormData(parsed.formData)
            setCurrentScreen(parsed.currentScreen || 0)
          } catch {}
        }
      } catch {
        router.push('/creator-onboarding')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, router])

  // Save to localStorage on every change
  useEffect(() => {
    if (token && !loading) {
      localStorage.setItem(`onboarding_${token}`, JSON.stringify({
        formData,
        currentScreen,
      }))
    }
  }, [token, loading, formData, currentScreen])

  const saveStep = useCallback(async (step: number) => {
    if (!token) return
    setSaving(true)
    try {
      await fetch('/api/creator-onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, step, data: getStepData(step) }),
      })
    } catch (err) {
      console.error('Failed to save step:', err)
    } finally {
      setSaving(false)
    }
  }, [token, formData])

  const getStepData = (step: number) => {
    switch (step) {
      case 0: return { name: formData.name, handle: formData.handle, consent: formData.consent }
      case 1: return { primary_niche: formData.primary_niche, secondary_niches: formData.secondary_niches, sub_niches: formData.sub_niches, content_types: formData.content_types }
      case 2: return { posts_per_week: formData.posts_per_week, has_brand_deals: formData.has_brand_deals, audience_age: formData.audience_age, content_language: formData.content_language, monetization: formData.monetization }
      case 3: return { content_style: formData.content_style, preferred_platforms: formData.preferred_platforms }
      case 4: return { wants_paid: formData.wants_paid, open_to_long_term: formData.open_to_long_term, open_exclusivity: formData.open_exclusivity, wants_gifting: formData.wants_gifting }
      case 5: return { rate_youtube_long: formData.rate_youtube_long, rate_youtube_shorts: formData.rate_youtube_shorts, rate_instagram_reel: formData.rate_instagram_reel, rate_instagram_post: formData.rate_instagram_post, rates_deferred: formData.rates_deferred }
      default: return {}
    }
  }

  const advanceScreen = async (fromScreen: number) => {
    await saveStep(fromScreen)
    if (fromScreen < SCREENS.length - 1) {
      setCurrentScreen(fromScreen + 1)
      setWillingnessIdx(0)
    } else {
      // Complete
      try {
        const res = await fetch('/api/creator-onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (res.ok) {
          localStorage.removeItem(`onboarding_${token}`)
          router.push(`/creator-onboarding/${token}/success`)
        }
      } catch (err) {
        console.error('Failed to complete:', err)
      }
    }
  }

  const goBack = async () => {
    if (currentScreen > 0) {
      await saveStep(currentScreen)
      setCurrentScreen(currentScreen - 1)
    }
  }

  const handleSaveAndQuit = async () => {
    await saveStep(currentScreen)
    router.push('/creator-onboarding')
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const computeCompleteness = (): number => {
    let filled = 0
    let total = 12
    if (formData.name) filled++
    if (formData.handle) filled++
    if (formData.primary_niche) filled++
    if (formData.posts_per_week) filled++
    if (formData.has_brand_deals) filled++
    if (formData.audience_age) filled++
    if (formData.content_language) filled++
    if (formData.monetization) filled++
    if (formData.wants_paid) filled++
    if (formData.open_to_long_term) filled++
    if (formData.content_style.length > 0) filled++
    if (formData.rate_youtube_long > 0 || formData.rate_youtube_shorts > 0 || formData.rates_deferred) filled++
    return Math.round((filled / total) * 100)
  }

  // Auto-fetch niche confidence
  useEffect(() => {
    if (currentScreen === 1 && niches.length > 0 && formData.handle && !formData.primary_niche) {
      fetch('/api/creator-onboarding/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, handle: formData.handle }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.niche) {
            const matched = niches.find((n) => n.niche_name.toLowerCase() === data.niche.toLowerCase())
            if (matched) {
              setNicheConfidence(data.confidence || 0)
              if ((data.confidence || 0) >= 0.7) {
                updateField('primary_niche', matched.niche_name)
                updateField('sub_niches', matched.sub_niches)
                updateField('content_types', matched.content_types)
              }
            }
          }
        })
        .catch(() => {})
    }
  }, [currentScreen, niches, formData.handle])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  const completeness = computeCompleteness()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-lg mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleSaveAndQuit}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Save & quit"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
            {SCREENS.map((s, i) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < currentScreen ? 'bg-green-500' : i === currentScreen ? 'bg-blue-500 scale-125' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-gray-400 tabular-nums">
            {currentScreen + 1}/{SCREENS.length}
          </span>
        </div>

        {/* Progress Cue */}
        <ProgressCue completeness={completeness} />

        {/* Back button */}
        {currentScreen > 0 && (
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-3 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Back
          </button>
        )}

        {/* Saving indicator */}
        {saving && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-center justify-center gap-2 text-xs text-gray-400"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </motion.div>
        )}

        {/* Screen Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {currentScreen === 0 && (
              <IdentityScreen
                formData={formData}
                onUpdate={updateField}
                onConfirm={() => advanceScreen(0)}
              />
            )}
            {currentScreen === 1 && (
              <NicheScreen
                niches={niches}
                formData={formData}
                confidence={nicheConfidence}
                onUpdate={updateField}
                onConfirm={() => advanceScreen(1)}
              />
            )}
            {currentScreen === 2 && (
              <BehavioralScreen
                formData={formData}
                onUpdate={updateField}
                onConfirm={() => advanceScreen(2)}
              />
            )}
            {currentScreen === 3 && (
              <ClusterScreen
                formData={formData}
                onUpdate={updateField}
                onConfirm={() => advanceScreen(3)}
              />
            )}
            {currentScreen === 4 && (
              <WillingnessScreen
                formData={formData}
                onUpdate={updateField}
                questionIdx={willingnessIdx}
                onNextQuestion={() => {
                  if (willingnessIdx < WILLINGNESS_QUESTIONS.length - 1) {
                    setWillingnessIdx(willingnessIdx + 1)
                  } else {
                    advanceScreen(4)
                  }
                }}
              />
            )}
            {currentScreen === 5 && (
              <RateScreen
                formData={formData}
                onUpdate={updateField}
                onConfirm={() => advanceScreen(5)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Screen Components ─────────────────────────────────────

function IdentityScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  const canProceed = formData.consent && formData.name.trim().length > 0 && formData.handle.trim().length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Let&apos;s get started</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          We need a few basics to set up your profile
        </p>
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <input
          type="checkbox"
          checked={formData.consent}
          onChange={(e) => onUpdate('consent', e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">I agree to share my creator info</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            This helps brands find and partner with you. You can opt out anytime.
          </div>
        </div>
      </label>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Your name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="e.g. Priya Sharma"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Handle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Instagram / YouTube handle
        </label>
        <input
          type="text"
          value={formData.handle}
          onChange={(e) => onUpdate('handle', e.target.value)}
          placeholder="@yourhandle"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Confirm */}
      <motion.button
        onClick={onConfirm}
        disabled={!canProceed}
        className={`
          w-full py-3.5 rounded-xl font-semibold text-sm transition-all
          ${canProceed
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }
        `}
        whileTap={canProceed ? { scale: 0.98 } : {}}
      >
        Continue
      </motion.button>
    </div>
  )
}

function NicheScreen({
  niches,
  formData,
  confidence,
  onUpdate,
  onConfirm,
}: {
  niches: NicheData[]
  formData: FormData
  confidence: number
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  const hasConfirmed = !!formData.primary_niche

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your niche</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {confidence >= 0.7 && !hasConfirmed
            ? `We think you create ${formData.primary_niche || 'content'} — does that look right?`
            : 'Pick the category that best describes your content'
          }
        </p>
      </div>

      {/* Confidence confirm prompt */}
      {confidence >= 0.7 && !hasConfirmed && formData.primary_niche && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">AI detected</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            {formData.primary_niche}
          </div>
          <div className="flex gap-2">
            <motion.button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              Looks right
            </motion.button>
            <motion.button
              onClick={() => onUpdate('primary_niche', null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              Let me choose
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Full niche grid (fallback or after "let me choose") */}
      {(!formData.primary_niche || confidence < 0.7) && (
        <NicheSelector
          niches={niches.map((n) => ({ name: n.niche_name, icon: n.icon, sub_niches: n.sub_niches, content_types: n.content_types }))}
          selectedPrimary={formData.primary_niche}
          selectedSecondary={formData.secondary_niches}
          onSelectPrimary={(niche) => {
            const match = niches.find((n) => n.niche_name === niche)
            onUpdate('primary_niche', niche)
            onUpdate('sub_niches', match?.sub_niches || [])
            onUpdate('content_types', match?.content_types || [])
          }}
          onSelectSecondary={(niches) => onUpdate('secondary_niches', niches)}
        />
      )}

      {formData.primary_niche && (
        <motion.button
          onClick={onConfirm}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25 transition-all"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Continue
        </motion.button>
      )}
    </div>
  )
}

function BehavioralScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  const [step, setStep] = useState(0)
  const q = BEHAVIORAL_QUESTIONS[step]

  const handleSelect = (value: string) => {
    onUpdate(q.key, value as any)
    setTimeout(() => {
      if (step < BEHAVIORAL_QUESTIONS.length - 1) {
        setStep(step + 1)
      } else {
        onConfirm()
      }
    }, 250)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick questions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tap your answer — we&apos;ll move you along
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          {BEHAVIORAL_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i < step ? 'bg-green-500' : i === step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <AutoAdvanceButton
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                selected={formData[q.key] === opt.value}
                onSelect={() => handleSelect(opt.value)}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ClusterScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  const styles = ['Educational', 'Entertainment', 'Lifestyle', 'Review', 'Tutorial', 'Vlog', 'Short-form', 'Long-form']
  const platforms = ['YouTube', 'Instagram', 'TikTok', 'Twitter']

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Content details</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Optional — helps match you with the right brands
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content style
        </label>
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <button
              key={style}
              onClick={() => {
                const styles = formData.content_style.includes(style)
                  ? formData.content_style.filter((s) => s !== style)
                  : [...formData.content_style, style]
                onUpdate('content_style', styles)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                formData.content_style.includes(style)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Preferred platforms
        </label>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => {
                const p = formData.preferred_platforms.includes(platform)
                  ? formData.preferred_platforms.filter((p) => p !== platform)
                  : [...formData.preferred_platforms, platform]
                onUpdate('preferred_platforms', p)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                formData.preferred_platforms.includes(platform)
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        onClick={onConfirm}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25 transition-all"
        whileTap={{ scale: 0.98 }}
      >
        Continue
      </motion.button>
    </div>
  )
}

function WillingnessScreen({
  formData,
  onUpdate,
  questionIdx,
  onNextQuestion,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  questionIdx: number
  onNextQuestion: () => void
}) {
  const q = WILLINGNESS_QUESTIONS[questionIdx]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your preferences</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Swipe or tap — {questionIdx + 1} of {WILLINGNESS_QUESTIONS.length}
        </p>
      </div>

      <BinarySwipeCard
        key={q.key}
        question={q.question}
        yesLabel={q.yesLabel}
        noLabel={q.noLabel}
        onSwipeRight={() => {
          onUpdate(q.key, 'yes' as any)
          setTimeout(onNextQuestion, 300)
        }}
        onSwipeLeft={() => {
          onUpdate(q.key, 'no' as any)
          setTimeout(onNextQuestion, 300)
        }}
      />
    </div>
  )
}

function RateScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  const hasAnyRate = formData.rate_youtube_long > 0 || formData.rate_youtube_shorts > 0 ||
    formData.rate_instagram_reel > 0 || formData.rate_instagram_post > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your rates</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Set your base rates or skip — we&apos;ll show them to brands
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RateChip
          label="YouTube Long"
          value={formData.rate_youtube_long}
          onChange={(v) => onUpdate('rate_youtube_long', v)}
        />
        <RateChip
          label="YouTube Shorts"
          value={formData.rate_youtube_shorts}
          onChange={(v) => onUpdate('rate_youtube_shorts', v)}
        />
        <RateChip
          label="Instagram Reel"
          value={formData.rate_instagram_reel}
          onChange={(v) => onUpdate('rate_instagram_reel', v)}
        />
        <RateChip
          label="Instagram Post"
          value={formData.rate_instagram_post}
          onChange={(v) => onUpdate('rate_instagram_post', v)}
        />
      </div>

      <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <input
          type="checkbox"
          checked={formData.rates_deferred}
          onChange={(e) => onUpdate('rates_deferred', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">Skip for now</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">We&apos;ll ask you later</div>
        </div>
      </label>

      <motion.button
        onClick={onConfirm}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25 transition-all"
        whileTap={{ scale: 0.98 }}
      >
        {hasAnyRate || formData.rates_deferred ? 'Complete setup' : 'Skip rates'}
      </motion.button>
    </div>
  )
}
