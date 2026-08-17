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
    case 1:
      return {
        name: data.name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        location: data.location,
        city: data.city,
        state: data.state,
        gender: data.gender,
        age_range: data.age_range,
        languages: data.languages,
      }
    case 2:
      return {
        primary_niche: data.primary_niche,
        secondary_niches: data.secondary_niches,
        sub_niches: data.sub_niches,
        content_types: data.content_types,
      }
    case 3:
      return {
        youtube_url: data.youtube_url,
        youtube_handle: data.youtube_handle,
        youtube_subscribers: data.youtube_subscribers,
        instagram_url: data.instagram_url,
        instagram_handle: data.instagram_handle,
        instagram_followers: data.instagram_followers,
        tiktok_url: data.tiktok_url,
        tiktok_followers: data.tiktok_followers,
        twitter_url: data.twitter_url,
        twitter_handle: data.twitter_handle,
        twitter_followers: data.twitter_followers,
        other_social: data.other_social,
      }
    case 4:
      return {
        avg_views: data.avg_views,
        avg_engagement: data.avg_engagement,
        avg_likes: data.avg_likes,
        avg_comments: data.avg_comments,
        total_videos: data.total_videos,
        total_views: data.total_views,
        audience_age_distribution: data.audience_age_distribution,
        audience_gender_distribution: data.audience_gender_distribution,
        audience_location_distribution: data.audience_location_distribution,
      }
    case 5:
      return {
        content_style: data.content_style,
        brand_collab_preferences: data.brand_collab_preferences,
        content_frequency: data.content_frequency,
        preferred_platforms: data.preferred_platforms,
        past_brand_collabs: data.past_brand_collabs,
        portfolio_url: data.portfolio_url,
      }
    case 6:
      return {
        rate_card: data.rate_card,
        currency: data.currency,
        negotiable: data.negotiable,
        min_rate: data.min_rate,
      }
    default:
      return {}
  }
}
