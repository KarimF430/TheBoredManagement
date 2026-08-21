'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X, ChevronLeft, Zap, Hand, DollarSign, MapPin, Phone } from 'lucide-react'
import AutoAdvanceButton from '@/components/creator-onboarding/AutoAdvanceButton'
import IdentityConstellation from '@/components/creator-onboarding/IdentityConstellation'
import BinarySwipeCard from '@/components/creator-onboarding/BinarySwipeCard'
import RateChip from '@/components/creator-onboarding/RateChip'
import NicheSelector from '@/components/creator-onboarding/NicheSelector'
import PredictiveLanguageSelect from '@/components/creator-onboarding/PredictiveLanguageSelect'
import TypeCard from '@/components/creator-onboarding/TypeCard'
import FormatChips from '@/components/creator-onboarding/FormatChips'
import BrandTagInput from '@/components/creator-onboarding/BrandTagInput'
import MetricStat from '@/components/creator-onboarding/MetricStat'
import ConfirmPrompt from '@/components/creator-onboarding/ConfirmPrompt'
import { INDIAN_STATES_LIST } from '@/lib/creator-onboarding-taxonomy'

interface Session {
  id: string
  token: string
  creator_email: string
  current_step: number
  completed_steps: number[]
}

interface BrandTag {
  name: string
  provenance: 'self_reported' | 'verified' | 'enriched'
}

interface FormData {
  consent: boolean
  name: string
  handle: string
  phone: string
  gender: string
  city: string
  state: string
  cluster: string | null
  primary_niche: string | null
  secondary_niches: string[]
  languages: string[]
  creator_type: string | null
  content_formats: string[]
  youtube_handle: string
  youtube_subscribers: number
  instagram_handle: string
  instagram_followers: number
  brands_worked: BrandTag[]
  posts_per_week: string
  has_brand_deals: string
  audience_age: string
  content_language: string
  monetization: string
  wants_paid: string
  open_to_long_term: string
  open_exclusivity: string
  wants_gifting: string
  rate_youtube_long: number
  rate_youtube_shorts: number
  rate_instagram_reel: number
  rate_instagram_post: number
  rates_deferred: boolean
}

const SCREENS = [
  { id: 'identity', label: 'Identity' },
  { id: 'niche', label: 'Niche' },
  { id: 'language', label: 'Language' },
  { id: 'type', label: 'Type' },
  { id: 'format', label: 'Format' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'brands', label: 'Brands' },
  { id: 'behavioral', label: 'Behavioral' },
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
    { value: '13-17', label: '13-17 (Gen Z)', icon: null },
    { value: '18-24', label: '18-24', icon: null },
    { value: '25-34', label: '25-34', icon: null },
    { value: '35+', label: '35+', icon: null },
    { value: 'mixed', label: 'Mixed / Don\'t know', icon: null },
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
  const params = useParams()
  const token = (params?.token as string) || searchParams.get('token')

  const [session, setSession] = useState<Session | null>(null)
  const [currentScreen, setCurrentScreen] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState('')
  const [willingnessIdx, setWillingnessIdx] = useState(0)
  const [behavIdx, setBehavIdx] = useState(0)
  const [nichePrefillConfidence, setNichePrefillConfidence] = useState(0)
  const [showNicheConfirm, setShowNicheConfirm] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    consent: false,
    name: '',
    handle: '',
    phone: '',
    gender: '',
    city: '',
    state: '',
    cluster: null,
    primary_niche: null,
    secondary_niches: [],
    languages: [],
    creator_type: null,
    content_formats: [],
    youtube_handle: '',
    youtube_subscribers: 0,
    instagram_handle: '',
    instagram_followers: 0,
    brands_worked: [],
    posts_per_week: '',
    has_brand_deals: '',
    audience_age: '',
    content_language: '',
    monetization: '',
    wants_paid: '',
    open_to_long_term: '',
    open_exclusivity: '',
    wants_gifting: '',
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
        const sessionRes = await fetch(`/api/creator-onboarding/session?token=${token}`)
        const sessionData = await sessionRes.json()

        if (!sessionRes.ok || !sessionData.session) {
          router.push('/creator-onboarding')
          return
        }

        if (sessionData.session.status === 'completed') {
          router.push(`/creator-onboarding/${token}/success`)
          return
        }

        setSession(sessionData.session)

        const saved = localStorage.getItem(`onboarding_${token}`)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setFormData(parsed.formData)
            setCurrentScreen(parsed.currentScreen || 0)
            setWillingnessIdx(parsed.willingnessIdx || 0)
            setBehavIdx(parsed.behavIdx || 0)
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

  useEffect(() => {
    if (token && !loading) {
      localStorage.setItem(`onboarding_${token}`, JSON.stringify({
        formData,
        currentScreen,
        willingnessIdx,
        behavIdx,
      }))
    }
  }, [token, loading, formData, currentScreen, willingnessIdx, behavIdx])

  // Niche AI pre-fill
  useEffect(() => {
    if (currentScreen === 1 && formData.handle && !formData.primary_niche && !showNicheConfirm) {
      fetch('/api/creator-onboarding/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, handle: formData.handle }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.prefilled && data.prediction?.primary_niche) {
            setNichePrefillConfidence(data.confidence || 0)
            if ((data.confidence || 0) >= 0.7) {
              setFormData(prev => ({
                ...prev,
                primary_niche: data.prediction.primary_niche,
                cluster: data.prediction.cluster || prev.cluster,
              }))
              setShowNicheConfirm(true)
            }
          }
        })
        .catch(() => {})
    }
  }, [currentScreen, formData.handle, token])

  const saveStep = useCallback(async (step: number) => {
    if (!token) return
    setSaving(true)
    try {
      await fetch('/api/creator-onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, step: step + 1, data: getStepData(step) }),
      })
    } catch (err) {
      console.error('Failed to save step:', err)
    } finally {
      setSaving(false)
    }
  }, [token, formData])

  const getStepData = (step: number) => {
    switch (step) {
      case 0: return { name: formData.name, handle: formData.handle, consent: formData.consent, phone: formData.phone, gender: formData.gender, city: formData.city, state: formData.state }
      case 1: return { cluster: formData.cluster, primary_niche: formData.primary_niche, secondary_niches: formData.secondary_niches }
      case 2: return { languages: formData.languages }
      case 3: return { creator_type: formData.creator_type }
      case 4: return { content_formats: formData.content_formats }
      case 5: return { youtube_handle: formData.youtube_handle, youtube_subscribers: formData.youtube_subscribers, instagram_handle: formData.instagram_handle, instagram_followers: formData.instagram_followers }
      case 6: return { brands_worked: formData.brands_worked }
      case 7: return { posts_per_week: formData.posts_per_week, has_brand_deals: formData.has_brand_deals, audience_age: formData.audience_age, content_language: formData.content_language, monetization: formData.monetization }
      case 8: return { wants_paid: formData.wants_paid, open_to_long_term: formData.open_to_long_term, open_exclusivity: formData.open_exclusivity, wants_gifting: formData.wants_gifting }
      case 9: return { rate_youtube_long: formData.rate_youtube_long, rate_youtube_shorts: formData.rate_youtube_shorts, rate_instagram_reel: formData.rate_instagram_reel, rate_instagram_post: formData.rate_instagram_post, rates_deferred: formData.rates_deferred }
      default: return {}
    }
  }

  const advanceScreen = async (fromScreen: number) => {
    await saveStep(fromScreen)
    if (fromScreen < SCREENS.length - 1) {
      setCurrentScreen(fromScreen + 1)
      setWillingnessIdx(0)
      setBehavIdx(0)
      setShowNicheConfirm(false)
    } else {
      setCompleting(true)
      setCompleteError('')
      try {
        const res = await fetch('/api/creator-onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          localStorage.removeItem(`onboarding_${token}`)
          router.push(`/creator-onboarding/${token}/success`)
        } else {
          setCompleteError(data.error || 'Failed to complete setup. Please try again.')
        }
      } catch {
        setCompleteError('Network error. Please check your connection and try again.')
      } finally {
        setCompleting(false)
      }
    }
  }

  const goBack = async () => {
    if (currentScreen > 0) {
      await saveStep(currentScreen)
      setCurrentScreen(currentScreen - 1)
      setShowNicheConfirm(false)
    }
  }

  const handleSaveAndQuit = async () => {
    await saveStep(currentScreen)
    router.push('/creator-onboarding')
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Constellation axes
  const constellationAxes = [
    { id: 'identity', label: 'Identity', filled: !!formData.name && !!formData.handle },
    { id: 'niche', label: 'Niche', filled: !!formData.primary_niche },
    { id: 'language', label: 'Language', filled: formData.languages.length > 0 },
    { id: 'type', label: 'Type', filled: !!formData.creator_type },
    { id: 'format', label: 'Format', filled: formData.content_formats.length > 0 },
    { id: 'brands', label: 'Brands', filled: formData.brands_worked.length > 0 },
  ]

  if (loading) {
    return (
      <div className="onb-shell">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--onb-coral)' }} />
      </div>
    )
  }

  return (
    <div className="onb-shell">
      <div className="onb-glow-top" />
      <div className="onb-glow-bottom" />

      <div className="onb-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleSaveAndQuit}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--onb-text-muted)' }}
            title="Save & quit"
          >
            <X className="w-5 h-5" />
          </button>
          <span
            style={{
              fontFamily: 'var(--onb-font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--onb-text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {currentScreen + 1}/{SCREENS.length}
          </span>
        </div>

        {/* Constellation */}
        <IdentityConstellation axes={constellationAxes} />

        {/* Back button */}
        {currentScreen > 0 && (
          <button
            onClick={goBack}
            className="flex items-center gap-1 mb-4 transition-colors"
            style={{
              fontFamily: 'var(--onb-font-body)',
              fontSize: 12,
              color: 'var(--onb-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}

        {/* Saving indicator */}
        {saving && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-center gap-2"
            style={{ fontSize: 11, color: 'var(--onb-text-muted)', fontFamily: 'var(--onb-font-body)' }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </motion.div>
        )}

        {/* Screen content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
          >
            {currentScreen === 0 && (
              <IdentityScreen formData={formData} onUpdate={updateField} onConfirm={() => advanceScreen(0)} />
            )}
            {currentScreen === 1 && (
              <NicheScreen
                formData={formData}
                onUpdate={updateField}
                onConfirm={() => advanceScreen(1)}
                showConfirm={showNicheConfirm}
                confidence={nichePrefillConfidence}
                onDismissConfirm={() => { setShowNicheConfirm(false); setFormData(prev => ({ ...prev, primary_niche: null, cluster: null })) }}
              />
            )}
            {currentScreen === 2 && (
              <LanguageScreen formData={formData} onUpdate={updateField} onConfirm={() => advanceScreen(2)} />
            )}
            {currentScreen === 3 && (
              <TypeScreen formData={formData} onUpdate={updateField} onConfirm={() => advanceScreen(3)} />
            )}
            {currentScreen === 4 && (
              <FormatScreen formData={formData} onUpdate={updateField} onConfirm={() => advanceScreen(4)} />
            )}
            {currentScreen === 5 && (
              <MetricsScreen formData={formData} onUpdate={updateField} onConfirm={() => advanceScreen(5)} />
            )}
            {currentScreen === 6 && (
              <BrandsScreen formData={formData} onUpdate={updateField} onConfirm={() => advanceScreen(6)} />
            )}
            {currentScreen === 7 && (
              <BehavioralScreen
                formData={formData}
                onUpdate={updateField}
                behavIdx={behavIdx}
                setBehavIdx={setBehavIdx}
                onConfirm={() => advanceScreen(7)}
              />
            )}
            {currentScreen === 8 && (
              <WillingnessScreen
                formData={formData}
                onUpdate={updateField}
                questionIdx={willingnessIdx}
                onNextQuestion={() => {
                  if (willingnessIdx < WILLINGNESS_QUESTIONS.length - 1) {
                    setWillingnessIdx(willingnessIdx + 1)
                  } else {
                    advanceScreen(8)
                  }
                }}
              />
            )}
            {currentScreen === 9 && (
              <RateScreen
                formData={formData}
                onUpdate={updateField}
                onConfirm={() => advanceScreen(9)}
                completing={completing}
                completeError={completeError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// Screen Components
// ═════════════════════════════════════════════════════════════════════

function IdentityScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  // Constellation axes — identity fields
  const identityAxes = [
    { id: 'consent', label: 'Consent', filled: formData.consent },
    { id: 'name', label: 'Name', filled: formData.name.trim().length > 0 },
    { id: 'handle', label: 'Handle', filled: formData.handle.trim().length > 0 },
    { id: 'location', label: 'Location', filled: formData.city.trim().length > 0 || formData.state.trim().length > 0 },
  ]

  const canProceed = formData.consent && formData.name.trim().length > 0 && formData.handle.trim().length > 0

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <h2 className="onb-title">Who are you?</h2>
        <p className="onb-subtitle" style={{ marginTop: 6 }}>Just the basics — we&apos;ll keep it between us.</p>
      </div>

      {/* Visibility constellation */}
      <IdentityConstellation axes={identityAxes} />

      {/* Consent gate */}
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          border: `1px solid ${formData.consent ? 'rgba(255,90,95,0.3)' : 'var(--onb-border)'}`,
          background: formData.consent ? 'rgba(255,90,95,0.06)' : 'rgba(22,20,40,0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: 28,
        }}
      >
        <input
          type="checkbox"
          checked={formData.consent}
          onChange={(e) => onUpdate('consent', e.target.checked)}
          style={{ marginTop: 2, accentColor: 'var(--onb-coral)', width: 16, height: 16, flexShrink: 0 }}
        />
        <div>
          <div style={{ fontFamily: 'var(--onb-font-display)', fontSize: 13, fontWeight: 700, color: 'var(--onb-text)', lineHeight: 1.3 }}>
            I agree to share my creator info
          </div>
          <div style={{ fontFamily: 'var(--onb-font-body)', fontSize: 11, color: 'var(--onb-text-muted)', marginTop: 3, lineHeight: 1.4 }}>
            This helps brands find and partner with you. Opt out anytime.
          </div>
        </div>
      </label>

      {/* Section: Who you are */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'var(--onb-font-display)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--onb-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: 12,
        }}>
          Who you are
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              placeholder="Your name"
              className="onb-input"
            />
          </div>
          <div>
            <input
              type="text"
              value={formData.handle}
              onChange={(e) => onUpdate('handle', e.target.value)}
              placeholder="@instagram or YouTube handle"
              className="onb-input"
            />
          </div>
          <div>
            <div style={{ position: 'relative' }}>
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--onb-text-muted)' }} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => onUpdate('phone', e.target.value)}
                placeholder="Phone number (optional)"
                className="onb-input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Where you are */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--onb-font-display)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--onb-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: 12,
        }}>
          Where you are
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <select
              value={formData.gender}
              onChange={(e) => onUpdate('gender', e.target.value)}
              className="onb-input"
              style={{ fontSize: 14 }}
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
            <div style={{ position: 'relative' }}>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--onb-text-muted)' }} />
              <input
                type="text"
                value={formData.city}
                onChange={(e) => onUpdate('city', e.target.value)}
                placeholder="City"
                className="onb-input"
                style={{ paddingLeft: 36, fontSize: 14 }}
              />
            </div>
          </div>
          <select
            value={formData.state}
            onChange={(e) => onUpdate('state', e.target.value)}
            className="onb-input"
            style={{ fontSize: 14 }}
          >
            <option value="">State</option>
            {INDIAN_STATES_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Confirm */}
      <motion.button
        onClick={onConfirm}
        disabled={!canProceed}
        className="onb-btn-primary"
        whileTap={canProceed ? { scale: 0.98 } : {}}
      >
        Continue
      </motion.button>
    </div>
  )
}

function NicheScreen({
  formData,
  onUpdate,
  onConfirm,
  showConfirm,
  confidence,
  onDismissConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
  showConfirm: boolean
  confidence: number
  onDismissConfirm: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="onb-title">Your niche</h2>
        <p className="onb-subtitle">
          {showConfirm && confidence >= 0.7
            ? `We think you create ${formData.primary_niche || 'content'} — does that look right?`
            : 'Pick the cluster that best describes your content'}
        </p>
      </div>

      {/* AI pre-fill confirm */}
      {showConfirm && confidence >= 0.7 && formData.primary_niche && (
        <ConfirmPrompt
          title={formData.primary_niche}
          subtitle="We predicted this from your handle and content"
          onConfirm={onConfirm}
          onReject={onDismissConfirm}
        />
      )}

      {/* Two-tap cluster → niche selector */}
      {!showConfirm && (
        <NicheSelector
          selectedCluster={formData.cluster}
          selectedPrimary={formData.primary_niche}
          selectedSecondary={formData.secondary_niches}
          onSelectCluster={(id) => onUpdate('cluster', id)}
          onSelectPrimary={(niche) => onUpdate('primary_niche', niche)}
          onSelectSecondary={(niches) => onUpdate('secondary_niches', niches)}
          onBack={() => {}}
        />
      )}

      {/* Continue button (when not in confirm mode) */}
      {!showConfirm && formData.primary_niche && (
        <motion.button
          onClick={onConfirm}
          className="onb-btn-primary"
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

function LanguageScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="onb-title">Languages</h2>
        <p className="onb-subtitle">What languages do you create content in?</p>
      </div>

      <PredictiveLanguageSelect
        selected={formData.languages}
        onChange={(langs) => onUpdate('languages', langs)}
        creatorState={formData.state}
      />

      {formData.languages.length > 0 && (
        <motion.button
          onClick={onConfirm}
          className="onb-btn-primary"
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

function TypeScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="onb-title">Who creates?</h2>
        <p className="onb-subtitle">Select the option that fits best</p>
      </div>

      <TypeCard selected={formData.creator_type} onSelect={(type) => onUpdate('creator_type', type)} />

      {formData.creator_type && (
        <motion.button
          onClick={onConfirm}
          className="onb-btn-primary"
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

function FormatScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="onb-title">Content format</h2>
        <p className="onb-subtitle">How do you create?</p>
      </div>

      <FormatChips
        selected={formData.content_formats}
        onChange={(formats) => onUpdate('content_formats', formats)}
      />

      {formData.content_formats.length > 0 && (
        <motion.button
          onClick={onConfirm}
          className="onb-btn-primary"
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

function MetricsScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="onb-title">Your channel</h2>
        <p className="onb-subtitle">Add your social handles — we'll verify metrics automatically</p>
      </div>

      {/* YouTube */}
      <div>
        <label className="onb-label">YouTube handle</label>
        <input
          type="text"
          value={formData.youtube_handle}
          onChange={(e) => onUpdate('youtube_handle', e.target.value)}
          placeholder="@yourchannel"
          className="onb-input"
        />
      </div>

      {/* Instagram */}
      <div>
        <label className="onb-label">Instagram handle</label>
        <input
          type="text"
          value={formData.instagram_handle}
          onChange={(e) => onUpdate('instagram_handle', e.target.value)}
          placeholder="@yourhandle"
          className="onb-input"
        />
      </div>

      {/* Metrics display (self-reported for now, verified on completion) */}
      {(formData.youtube_subscribers > 0 || formData.instagram_followers > 0) && (
        <div className="space-y-2">
          {formData.youtube_subscribers > 0 && (
            <MetricStat
              label="YouTube subscribers"
              value={formData.youtube_subscribers}
              provenance="self_reported"
              format="views"
            />
          )}
          {formData.instagram_followers > 0 && (
            <MetricStat
              label="Instagram followers"
              value={formData.instagram_followers}
              provenance="self_reported"
              format="views"
            />
          )}
        </div>
      )}

      <motion.button
        onClick={onConfirm}
        className="onb-btn-primary"
        whileTap={{ scale: 0.98 }}
      >
        Continue
      </motion.button>
    </div>
  )
}

function BrandsScreen({
  formData,
  onUpdate,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="onb-title">Brand work</h2>
        <p className="onb-subtitle">Any brands you've collaborated with? Totally optional.</p>
      </div>

      <BrandTagInput
        brands={formData.brands_worked}
        onChange={(brands) => onUpdate('brands_worked', brands)}
      />

      <button onClick={onConfirm} className="onb-skip" style={{ width: '100%', textAlign: 'center' }}>
        Skip for now
      </button>

      {formData.brands_worked.length > 0 && (
        <motion.button
          onClick={onConfirm}
          className="onb-btn-primary"
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
  behavIdx,
  setBehavIdx,
  onConfirm,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  behavIdx: number
  setBehavIdx: (idx: number) => void
  onConfirm: () => void
}) {
  const q = BEHAVIORAL_QUESTIONS[behavIdx]

  const handleSelect = (value: string) => {
    onUpdate(q.key, value as any)
    setTimeout(() => {
      if (behavIdx < BEHAVIORAL_QUESTIONS.length - 1) {
        setBehavIdx(behavIdx + 1)
      } else {
        onConfirm()
      }
    }, 250)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="onb-title">Quick questions</h2>
        <p className="onb-subtitle">Tap your answer — we&apos;ll move you along</p>
        {/* Sub-step progress */}
        <div className="flex gap-1.5 mt-3">
          {BEHAVIORAL_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all"
              style={{
                background: i < behavIdx ? 'var(--onb-coral)' : i === behavIdx ? 'var(--onb-coral)' : 'var(--onb-border)',
                opacity: i < behavIdx ? 0.5 : 1,
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={behavIdx}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
        >
          <p
            style={{
              fontFamily: 'var(--onb-font-display)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--onb-text)',
              marginBottom: 16,
            }}
          >
            {q.question}
          </p>
          <div className="space-y-2.5">
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
    <div className="space-y-6">
      <div>
        <h2 className="onb-title">Your preferences</h2>
        <p className="onb-subtitle">
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
  completing,
  completeError,
}: {
  formData: FormData
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onConfirm: () => void
  completing: boolean
  completeError: string
}) {
  const hasAnyRate = formData.rate_youtube_long > 0 || formData.rate_youtube_shorts > 0 ||
    formData.rate_instagram_reel > 0 || formData.rate_instagram_post > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="onb-title">Your rates</h2>
        <p className="onb-subtitle">Set your base rates or skip — we&apos;ll show them to brands</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RateChip label="YouTube Long" value={formData.rate_youtube_long} onChange={(v) => onUpdate('rate_youtube_long', v)} />
        <RateChip label="YouTube Shorts" value={formData.rate_youtube_shorts} onChange={(v) => onUpdate('rate_youtube_shorts', v)} />
        <RateChip label="Instagram Reel" value={formData.rate_instagram_reel} onChange={(v) => onUpdate('rate_instagram_reel', v)} />
        <RateChip label="Instagram Post" value={formData.rate_instagram_post} onChange={(v) => onUpdate('rate_instagram_post', v)} />
      </div>

      <label
        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors"
        style={{
          border: '1px solid var(--onb-border)',
          background: 'rgba(22,20,40,0.3)',
        }}
      >
        <input
          type="checkbox"
          checked={formData.rates_deferred}
          onChange={(e) => onUpdate('rates_deferred', e.target.checked)}
          style={{ accentColor: 'var(--onb-coral)' }}
        />
        <div>
          <div style={{ fontFamily: 'var(--onb-font-display)', fontSize: 13, fontWeight: 700, color: 'var(--onb-text)' }}>
            Skip for now
          </div>
          <div style={{ fontFamily: 'var(--onb-font-body)', fontSize: 11, color: 'var(--onb-text-muted)', marginTop: 2 }}>
            We&apos;ll ask you later
          </div>
        </div>
      </label>

      {completeError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl"
          style={{
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.2)',
            fontFamily: 'var(--onb-font-body)',
            fontSize: 13,
            color: '#FCA5A5',
          }}
        >
          {completeError}
        </motion.div>
      )}

      <motion.button
        onClick={onConfirm}
        disabled={completing}
        className="onb-btn-primary"
        style={completing ? { opacity: 0.6 } : {}}
        whileTap={!completing ? { scale: 0.98 } : {}}
      >
        {completing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Setting up your profile...
          </span>
        ) : hasAnyRate || formData.rates_deferred ? (
          'Complete setup'
        ) : (
          'Skip rates'
        )}
      </motion.button>
    </div>
  )
}
