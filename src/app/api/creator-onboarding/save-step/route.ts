/**
 * Creator Onboarding — Save Step
 *
 * Each step commit:
 * 1. Saves draft data
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

const STEP_EVENTS: Record<number, 'step_1_completed' | 'step_2_completed' | 'step_3_completed' | 'step_4_completed' | 'step_5_completed' | 'step_6_completed'> = {
  1: 'step_1_completed',
  2: 'step_2_completed',
  3: 'step_3_completed',
  4: 'step_4_completed',
  5: 'step_5_completed',
  6: 'step_6_completed',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, step, data } = body

    if (!token || !step || !data) {
      return NextResponse.json({ error: 'Token, step, and data are required' }, { status: 400 })
    }

    if (step < 1 || step > 6) {
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

    // ── Sanitize input (section 5: injection prevention) ─────
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
    const eventName = STEP_EVENTS[step]
    if (eventName) {
      await emitFunnelEvent(session.id, eventName, { step, fields_updated: Object.keys(stepUpdates) })
    }

    // ── Write partial raw_signals (idempotent, per step) ─────
    // Only write after step 2 (niche) since that's when personalizer has enough context
    if (step >= 2) {
      try {
        // Resolve creator identity if not yet linked
        const { outreachCreatorId } = await resolveCreatorIdentity(session, {
          ...draft,
          ...stepUpdates,
        } as any)

        // Build raw_signals from current draft state
        const mergedDraft = { ...draft, ...stepUpdates } as any
        const rawSignals = buildRawSignals(mergedDraft, session)

        // Write to outreach_creators (idempotent)
        await writeRawSignalsToOutreach(outreachCreatorId, rawSignals)
      } catch (err) {
        // Non-fatal: raw_signals write failure doesn't block the step save
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

// ── Input Sanitization (section 5) ──────────────────────────────

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
      // Block injection payloads
      if (BLOCKED_PATTERNS.some((p) => p.test(value))) {
        sanitized[key] = ''
        continue
      }
      // Length cap
      sanitized[key] = value.slice(0, MAX_STRING_LENGTH)
    } else if (Array.isArray(value)) {
      // Array length cap + sanitize each element
      sanitized[key] = value
        .slice(0, MAX_ARRAY_LENGTH)
        .map((v) =>
          typeof v === 'string'
            ? v.slice(0, MAX_STRING_LENGTH)
            : v
        )
    } else if (typeof value === 'object' && value !== null) {
      // Shallow sanitize nested objects
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (typeof value === 'number') {
      // Range check for numbers (reject absurd values)
      if (!Number.isFinite(value) || Math.abs(value) > 1e12) {
        sanitized[key] = 0
      } else {
        sanitized[key] = value
      }
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
      if (BLOCKED_PATTERNS.some((p) => p.test(value))) {
        sanitized[key] = ''
      } else {
        sanitized[key] = value.slice(0, MAX_STRING_LENGTH)
      }
    } else if (typeof value === 'number' && (Number.isFinite(value) && Math.abs(value) <= 1e12)) {
      sanitized[key] = value
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    }
  }
  return sanitized
}

function mapStepToDraft(step: number, data: Record<string, unknown>) {
  switch (step) {
    case 1: { // Identity Screen
      const rawHandle = (data.handle as string) || ''
      const cleanHandle = rawHandle.replace('@', '').trim()
      return {
        name: data.name,
        youtube_handle: cleanHandle,
        instagram_handle: cleanHandle,
        step_data: {
          consent: data.consent,
          handle: rawHandle,
          identity_completed_at: new Date().toISOString()
        }
      }
    }
    case 2: // Niche Screen
      return {
        primary_niche: data.primary_niche,
        secondary_niches: data.secondary_niches,
        sub_niches: data.sub_niches,
        content_types: data.content_types,
      }
    case 3: // Behavioral Screen (UI step 3)
      return {
        content_frequency: data.posts_per_week,
        age_range: data.audience_age,
        languages: data.content_language ? [data.content_language as string] : [],
        step_data: {
          has_brand_deals: data.has_brand_deals,
          monetization: data.monetization,
        }
      }
    case 4: // Cluster Screen (UI step 4)
      return {
        content_style: data.content_style,
        preferred_platforms: data.preferred_platforms,
      }
    case 5: // Willingness Screen (UI step 5)
      return {
        step_data: {
          wants_paid: data.wants_paid,
          open_to_long_term: data.open_to_long_term,
          open_exclusivity: data.open_exclusivity,
          wants_gifting: data.wants_gifting,
        }
      }
    case 6: { // Rates Screen (UI step 6)
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
