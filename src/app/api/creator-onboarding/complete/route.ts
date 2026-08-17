/**
 * Creator Onboarding — Complete Profile
 *
 * THE CRITICAL WRITE PATH:
 * 1. Resolve creator identity (link to outreach_creators)
 * 2. Record consent (DPDP gate)
 * 3. Pull verified metrics (YouTube API)
 * 4. Build raw_signals (personalizer contract)
 * 5. Write to cp_creator_pool
 * 6. Write raw_signals to outreach_creators
 * 7. Emit funnel event
 * 8. Calculate verified-only tier
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import {
  getOnboardingSession,
  getOrCreateDraft,
  updateOnboardingSession,
} from '@/lib/creator-onboarding'
import {
  resolveCreatorIdentity,
  buildRawSignals,
  writeRawSignalsToOutreach,
  pullVerifiedMetrics,
  calculateVerifiedTier,
  emitFunnelEvent,
  recordConsent,
  hasConsent,
} from '@/lib/creator-onboarding-integration'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
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

    // ── Consent gate (section 5) ─────────────────────────────
    const consentExists = await hasConsent(session.id)
    if (!consentExists) {
      // Auto-record consent on completion (creator implicitly consents by submitting)
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null
      const ua = req.headers.get('user-agent') || null
      await recordConsent(session.id, ip || undefined, ua || undefined)
    }

    // ── Get draft ────────────────────────────────────────────
    const draft = await getOrCreateDraft(session.id)

    // ── Step 1: Resolve creator identity (section 2) ─────────
    const { outreachCreatorId, wasCreated } = await resolveCreatorIdentity(session, draft)

    // ── Step 2: Pull verified metrics (section 3) ────────────
    let verifiedMetrics = null
    try {
      verifiedMetrics = await pullVerifiedMetrics(draft)

      // Cache verified metrics
      const client = getCPClient()
      await client.from('onboarding_verified_metrics').upsert({
        session_id: session.id,
        youtube_channel_id: verifiedMetrics.youtube?.channelId || null,
        youtube_subscribers: verifiedMetrics.youtube?.subscriberCount || 0,
        youtube_views: verifiedMetrics.youtube?.viewCount || 0,
        youtube_videos: verifiedMetrics.youtube?.videoCount || 0,
        youtube_country: verifiedMetrics.youtube?.country || null,
        youtube_recent_titles: verifiedMetrics.youtube?.recentVideoTitles || [],
        youtube_avg_views: verifiedMetrics.avgViews,
        youtube_engagement_rate: verifiedMetrics.engagementRate,
        youtube_verified_at: verifiedMetrics.youtube ? new Date().toISOString() : null,
        instagram_verified: verifiedMetrics.instagram?.provenance === 'verified',
        instagram_followers: verifiedMetrics.instagram?.followers || 0,
        instagram_engagement_rate: verifiedMetrics.instagram?.engagementRate || 0,
        total_followers: verifiedMetrics.totalFollowers,
        provenance: verifiedMetrics.youtube ? 'verified' : 'self_reported',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })

      await emitFunnelEvent(session.id, 'metrics_verified', {
        youtube: !!verifiedMetrics.youtube,
        instagram: !!verifiedMetrics.instagram,
        provenance: verifiedMetrics.youtube ? 'verified' : 'self_reported',
      })
    } catch (err) {
      // Metric pull failure is non-fatal — continue with self-reported data
      console.error('Metric verification failed:', err)
    }

    // ── Step 3: Build raw_signals (personalizer contract) ─────
    const rawSignals = buildRawSignals(draft, session, verifiedMetrics || undefined)

    // ── Step 4: Calculate verified-only tier (section 3 rule) ─
    const selfReportedFollowers =
      (draft.youtube_subscribers || 0) + (draft.instagram_followers || 0)
    const { tier, verified: tierVerified } = calculateVerifiedTier(
      verifiedMetrics || null,
      selfReportedFollowers
    )

    // ── Step 5: Write to cp_creator_pool ─────────────────────
    const client = getCPClient()
    const { data: creator, error: creatorError } = await client
      .from('cp_creator_pool')
      .insert({
        name: draft.name || session.creator_name || 'Unknown Creator',
        email: session.creator_email,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        location: draft.location,
        city: draft.city,
        state: draft.state,
        gender: draft.gender,
        age_range: draft.age_range,
        languages: draft.languages || [],
        languages_spoken: draft.languages || [],

        // Social profiles
        youtube_url: draft.youtube_url,
        youtube_handle: draft.youtube_handle,
        youtube_channel_id: verifiedMetrics?.youtube?.channelId || null,
        instagram_url: draft.instagram_url,
        instagram_handle: draft.instagram_handle,
        tiktok_url: draft.tiktok_url,
        twitter_url: draft.twitter_url,

        // Metadata (verified where possible)
        niche: draft.primary_niche ? [draft.primary_niche] : [],
        sub_niche: draft.sub_niches || [],
        content_type: draft.content_types || [],
        subscribers: verifiedMetrics?.totalFollowers || selfReportedFollowers,
        avg_views: verifiedMetrics?.avgViews || draft.avg_views || 0,
        avg_engagement: verifiedMetrics?.engagementRate
          ? verifiedMetrics.engagementRate * 100
          : draft.avg_engagement || 0,
        avg_likes: draft.avg_likes || 0,
        avg_comments: draft.avg_comments || 0,
        total_videos: verifiedMetrics?.youtube?.videoCount || draft.total_videos || 0,
        total_views: verifiedMetrics?.youtube?.viewCount || draft.total_views || 0,
        country: 'India',

        // Pricing
        rate_card: draft.rate_card || {},
        internal_rate: draft.min_rate || 0,
        currency: draft.currency || 'INR',

        // Classification (verified-only tier)
        tier,
        brand_safety: 'safe',
        tags: [...(draft.secondary_niches || []), ...(draft.content_style || [])],

        // Status
        status: 'active',
        source: 'onboarding',
        added_by: 'creator_onboarding',
        last_refreshed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (creatorError) {
      throw new Error(`Failed to create creator: ${creatorError.message}`)
    }

    // ── Step 6: Write raw_signals to outreach_creators ───────
    await writeRawSignalsToOutreach(outreachCreatorId, rawSignals)

    // Also update outreach_creators pool_creator_id
    const { outreachSelect, outreachUpdate } = await import('@/lib/outreach/db')
    await outreachUpdate('outreach_creators', 'id', outreachCreatorId, {
      pool_creator_id: creator.id,
    })

    // ── Step 7: Update session as completed ──────────────────
    await updateOnboardingSession(session.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      pool_creator_id: creator.id,
    })

    // ── Step 8: Emit completion event ────────────────────────
    await emitFunnelEvent(session.id, 'profile_completed', {
      creator_id: creator.id,
      outreach_creator_id: outreachCreatorId,
      tier,
      tier_verified: tierVerified,
      profile_completeness: rawSignals.profile_completeness,
      verified_youtube: !!verifiedMetrics?.youtube,
    })

    // ── Step 9: Update pilot tracker if exists ───────────────
    await client
      .from('onboarding_pilot')
      .update({ completed_at: new Date().toISOString() })
      .eq('session_id', session.id)

    return NextResponse.json({
      ok: true,
      creatorId: creator.id,
      outreachCreatorId,
      tier,
      tierVerified,
      profileCompleteness: rawSignals.profile_completeness,
      message: 'Profile completed successfully!',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
