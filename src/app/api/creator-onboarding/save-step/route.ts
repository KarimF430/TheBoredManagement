/**
 * Creator Onboarding — Save Step (Multi-Axis)
 *
 * Each axis commit:
 * 1. Saves per-axis draft data
 * 2. Emits a funnel event
 * 3. Writes partial raw_signals to outreach_creators (idempotent)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getOnboardingSession,
  getOrCreateDraft,
  updateDraft,
  updateOnboardingSession,
} from '@/lib/creator-onboarding'
import {
  resolveCreatorIdentity,
  buildRawSignals,
  writeRawSignalsToOutreach,
  emitFunnelEvent,
} from '@/lib/creator-onboarding-integration'

const STEP_EVENTS = [
  'step_1_completed',
  'step_2_completed',
  'step_3_completed',
  'step_4_completed',
  'step_5_completed',
  'step_6_completed',
  'step_7_completed',
  'step_8_completed',
  'step_9_completed',
  'step_10_completed',
] as const

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, step, data } = body

    if (!token || !step || !data) {
      return NextResponse.json({ error: 'Token, step, and data are required' }, { status: 400 })
    }

    if (step < 1 || step > 10) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 })
    }

    // ── Get session ──────────────────────────────────────────
    const session = await getOnboardingSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session.otp_verified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Profile already completed' }, { status: 400 })
    }

    // ── Sanitize input ───────────────────────────────────────
    const sanitizedData = sanitizeInput(data)

    // ── Get or create draft ──────────────────────────────────
    const draft = await getOrCreateDraft(session.id)

    // ── Map step data to draft fields ────────────────────────
    const stepUpdates = mapStepToDraft(step, sanitizedData)

    // Merge step_data to prevent overwriting keys from previous steps
    if (stepUpdates.step_data) {
      stepUpdates.step_data = {
        ...(draft.step_data || {}),
        ...stepUpdates.step_data
      }
    }

    // ── Update draft ─────────────────────────────────────────
    await updateDraft(session.id, stepUpdates as any)

    // ── Update session progress ──────────────────────────────
    const completedSteps = [...new Set([...(session.completed_steps || []), step])]
    await updateOnboardingSession(session.id, {
      current_step: Math.max(session.current_step, step + 1),
      completed_steps: completedSteps,
    })

    // ── Emit funnel event ────────────────────────────────────
    const eventName = STEP_EVENTS[step - 1]
    if (eventName) {
      await emitFunnelEvent(session.id, eventName, { step, fields_updated: Object.keys(stepUpdates) })
    }

    // ── Write partial raw_signals (idempotent, per step) ─────
    // Write after step 2 (niche) since that's when personalizer has enough context
    if (step >= 2) {
      try {
        const { outreachCreatorId } = await resolveCreatorIdentity(session, {
          ...draft,
          ...stepUpdates,
        } as any)

        const mergedDraft = { ...draft, ...stepUpdates } as any
        const rawSignals = buildRawSignals(mergedDraft, session)
        await writeRawSignalsToOutreach(outreachCreatorId, rawSignals)
      } catch (err) {
        console.error('raw_signals write failed:', err)
      }
    }

    return NextResponse.json({
      ok: true,
      draftId: draft.id,
      completedSteps: [...completedSteps].sort(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Input Sanitization ──────────────────────────────────────────

const MAX_STRING_LENGTH = 500
const MAX_ARRAY_LENGTH = 20
const BLOCKED_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
]

function sanitizeInput(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      if (BLOCKED_PATTERNS.some((p) => p.test(value))) {
        sanitized[key] = ''
        continue
      }
      sanitized[key] = value.slice(0, MAX_STRING_LENGTH)
    } else if (Array.isArray(value)) {
      sanitized[key] = value
        .slice(0, MAX_ARRAY_LENGTH)
        .map((v) => typeof v === 'string' ? v.slice(0, MAX_STRING_LENGTH) : v)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (typeof value === 'number') {
      sanitized[key] = Number.isFinite(value) && Math.abs(value) <= 1e12 ? value : 0
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    } else {
      sanitized[key] = null
    }
  }

  return sanitized
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = BLOCKED_PATTERNS.some((p) => p.test(value)) ? '' : value.slice(0, MAX_STRING_LENGTH)
    } else if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e12) {
      sanitized[key] = value
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    }
  }
  return sanitized
}

// ── Per-Axis Step Mapping ───────────────────────────────────────

function mapStepToDraft(step: number, data: Record<string, unknown>) {
  switch (step) {
    case 1: { // Identity Screen
      const rawHandle = (data.handle as string) || ''
      const cleanHandle = rawHandle.replace('@', '').trim()
      return {
        name: data.name,
        phone: data.phone || null,
        gender: data.gender || null,
        city: data.city || null,
        state: data.state || null,
        youtube_handle: cleanHandle,
        instagram_handle: cleanHandle,
        consent_given: data.consent,
        step_data: {
          consent: data.consent,
          handle: rawHandle,
          identity_completed_at: new Date().toISOString()
        }
      }
    }
    case 2: { // Niche Screen (two-tap cluster → niche)
      return {
        cluster: data.cluster,
        primary_niche: data.primary_niche,
        secondary_niches: data.secondary_niches || [],
        niche_provenance: 'self_reported',
        step_data: {
          niche_completed_at: new Date().toISOString()
        }
      }
    }
    case 3: { // Language Screen (predictive multi-select)
      return {
        languages: data.languages || [],
        languages_preselected: true,
      }
    }
    case 4: { // Creator Type Screen (single-select)
      return {
        creator_type: data.creator_type,
      }
    }
    case 5: { // Content Format Screen (multi-select)
      return {
        content_formats: data.content_formats || [],
      }
    }
    case 6: { // Metrics Screen (handles + self-reported)
      const ytHandle = (data.youtube_handle as string || '').replace('@', '').trim()
      const igHandle = (data.instagram_handle as string || '').replace('@', '').trim()
      return {
        youtube_handle: ytHandle || null,
        youtube_subscribers: data.youtube_subscribers || 0,
        instagram_handle: igHandle || null,
        instagram_followers: data.instagram_followers || 0,
        metrics_provenance: 'self_reported',
      }
    }
    case 7: { // Brands Screen (light tag input)
      return {
        brands_worked: data.brands_worked || [],
        past_brand_collabs: Array.isArray(data.brands_worked)
          ? (data.brands_worked as Array<{ name: string }>).map(b => b.name)
          : [],
      }
    }
    case 8: { // Behavioral Screen (multi-question auto-advance)
      return {
        content_frequency: data.posts_per_week,
        age_range: data.audience_age,
        languages: data.content_language ? [data.content_language as string] : undefined,
        step_data: {
          has_brand_deals: data.has_brand_deals,
          monetization: data.monetization,
        }
      }
    }
    case 9: { // Willingness Screen (binary swipes)
      return {
        step_data: {
          wants_paid: data.wants_paid,
          open_to_long_term: data.open_to_long_term,
          open_exclusivity: data.open_exclusivity,
          wants_gifting: data.wants_gifting,
        }
      }
    }
    case 10: { // Rates Screen
      const rateCard = {
        youtube_long: data.rate_youtube_long || 0,
        youtube_shorts: data.rate_youtube_shorts || 0,
        instagram_reel: data.rate_instagram_reel || 0,
        instagram_post: data.rate_instagram_post || 0,
      }
      return {
        rate_card: rateCard,
        currency: data.currency || 'INR',
        negotiable: data.negotiable !== false,
        min_rate: data.min_rate || null,
        step_data: {
          rates_deferred: data.rates_deferred
        }
      }
    }
    default:
      return {}
  }
}
