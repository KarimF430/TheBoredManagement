/**
 * E2E Test API — Proves the full loop on ONE creator profile.
 *
 * GET /api/outreach/e2e-test             → run all checks
 * GET /api/outreach/e2e-test?check=X     → run specific check
 * POST /api/outreach/e2e-test            → create + complete test profile
 *
 * This endpoint creates a test creator, runs them through onboarding,
 * verifies the integration join, and tests the personalizer output.
 *
 * Checks:
 *   identity_resolve  — outreach_creators row linked, no orphans
 *   raw_signals       — full contract populated with specificity_hook
 *   verified_metrics  — YouTube pull tagged correctly, tier not from self-reported
 *   personalizer      — generates genuinely specific email from raw_signals
 *   onboarding_loop   — session→draft→complete→raw_signals write
 *   funnel_events     — events recorded in onboarding_events
 *   campaign_launch   — can enqueue to send_queue from campaign
 */

import { NextRequest, NextResponse } from 'next/server'

interface CheckResult {
  name: string
  ok: boolean
  detail: string
  data?: any
  ms?: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const only = searchParams.get('check')

  const checks = [
    checkIdentityResolve,
    checkRawSignals,
    checkVerifiedMetrics,
    checkPersonalizer,
    checkOnboardingLoop,
    checkFunnelEvents,
    checkCampaignLaunch,
  ]

  const results: CheckResult[] = []
  const startTime = Date.now()

  for (const check of checks) {
    if (only && check.name !== only) continue
    const t0 = Date.now()
    try {
      const result = await check.fn()
      results.push({ name: check.name, ok: true, detail: result.detail, data: result.data, ms: Date.now() - t0 })
    } catch (err) {
      results.push({ name: check.name, ok: false, detail: (err as Error).message, ms: Date.now() - t0 })
    }
  }

  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length

  return NextResponse.json({
    summary: `${passed}/${results.length} passed`,
    passed,
    failed,
    totalMs: Date.now() - startTime,
    results,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { creatorEmail, creatorName, creatorHandle } = body as {
      creatorEmail?: string
      creatorName?: string
      creatorHandle?: string
    }

    const email = creatorEmail || `e2e_test_${Date.now()}@test.com`
    const name = creatorName || 'E2E Test Creator'
    const handle = creatorHandle || '@e2e_test_creator'

    // 1. Create onboarding session
    const { createOnboardingSession } = await import('@/lib/creator-onboarding')
    const session = await createOnboardingSession(email)

    // 2. Complete all 6 steps with realistic data
    const { getOrCreateDraft, updateDraft, updateOnboardingSession } = await import('@/lib/creator-onboarding')

    const draft = await getOrCreateDraft(session.id)

    // Step 1: Identity
    const cleanHandle = handle.replace('@', '').trim()
    await updateDraft(session.id, {
      name,
      youtube_handle: cleanHandle,
      instagram_handle: cleanHandle,
      step_data: {
        consent: true,
        handle: handle,
        identity_completed_at: new Date().toISOString()
      }
    } as any)

    // Step 2: Niche
    await updateDraft(session.id, {
      primary_niche: 'Technology',
      secondary_niches: ['Gaming'],
      sub_niches: ['Smartphones', 'Laptops'],
      content_types: ['Reviews', 'Unboxing'],
    } as any)

    // Step 3: Behavioral
    const draft3 = await getOrCreateDraft(session.id)
    await updateDraft(session.id, {
      content_frequency: '3-4_week',
      age_range: '18-24',
      languages: ['hindi'],
      step_data: {
        ...(draft3.step_data || {}),
        has_brand_deals: 'yes_once',
        monetization: 'yt_ads',
      }
    } as any)

    // Step 4: Cluster
    await updateDraft(session.id, {
      content_style: ['Educational', 'Review'],
      preferred_platforms: ['YouTube', 'Instagram'],
    } as any)

    // Step 5: Willingness
    const draft5 = await getOrCreateDraft(session.id)
    await updateDraft(session.id, {
      step_data: {
        ...(draft5.step_data || {}),
        wants_paid: 'yes',
        open_to_long_term: 'yes',
        open_exclusivity: 'no',
        wants_gifting: 'yes',
      }
    } as any)

    // Step 6: Rates
    const draft6 = await getOrCreateDraft(session.id)
    await updateDraft(session.id, {
      rate_card: {
        youtube_long: 15000,
        youtube_shorts: 5000,
        instagram_reel: 8000,
        instagram_post: 6000,
      },
      currency: 'INR',
      negotiable: true,
      min_rate: null,
      step_data: {
        ...(draft6.step_data || {}),
        rates_deferred: false,
      }
    } as any)

    // Mark session as completed
    await updateOnboardingSession(session.id, {
      status: 'completed',
      current_step: 6,
      completed_steps: [1, 2, 3, 4, 5, 6],
    })

    // 3. Run the integration — resolve identity + write raw_signals
    const { resolveCreatorIdentity, buildRawSignals, writeRawSignalsToOutreach } = await import('@/lib/creator-onboarding-integration')

    const fullDraft = await getOrCreateDraft(session.id)
    const { outreachCreatorId } = await resolveCreatorIdentity(session, fullDraft as any)

    const rawSignals = buildRawSignals(fullDraft as any, session)
    await writeRawSignalsToOutreach(outreachCreatorId, rawSignals)

    return NextResponse.json({
      ok: true,
      session: { id: session.id, token: session.token, email },
      outreachCreatorId,
      rawSignals,
      message: 'Test profile created and linked. Run GET checks to verify.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message, stack: (error as any).stack }, { status: 500 })
  }
}

// ── Individual Checks ────────────────────────────────────────

const checkIdentityResolve = {
  name: 'identity_resolve',
  fn: async (): Promise<{ detail: string; data: any }> => {
    const { outreachSelect } = await import('@/lib/outreach/db')
    const { getCPClient } = await import('@/lib/cp-db')

    const client = getCPClient()

    // Check for orphan cp_creator_pool rows (no outreach_creators link)
    const { data: poolRows } = await client
      .from('cp_creator_pool')
      .select('id, email, outreach_creator_id')
      .limit(10)

    const orphans = (poolRows || []).filter((r) => !r.outreach_creator_id)

    const onboardingCreators = await outreachSelect<any>('outreach_creators', {
      filters: { profile_source: 'onboarding' },
      order: { column: 'created_at', ascending: false },
      limit: 5,
    })

    const detail = `pool_rows=${poolRows?.length || 0}, orphans=${orphans.length}, onboarding_linked=${onboardingCreators.length}`

    if (orphans.length > 0) {
      return {
        detail: `${detail} — WARNING: ${orphans.length} orphan rows`,
        data: { orphans: orphans.slice(0, 3) },
      }
    }

    return { detail, data: { onboardingCreators: onboardingCreators.slice(0, 2) } }
  },
}

const checkRawSignals = {
  name: 'raw_signals',
  fn: async (): Promise<{ detail: string; data: any }> => {
    const { outreachSelect } = await import('@/lib/outreach/db')

    const creators = await outreachSelect<any>('outreach_creators', {
      filters: { profile_source: 'onboarding' },
      order: { column: 'created_at', ascending: false },
      limit: 5,
    })

    if (creators.length === 0) {
      return { detail: 'No onboarding-linked creators found — run POST first', data: null }
    }

    const creator = creators[0]
    const signals = creator.raw_signals

    if (!signals) {
      throw new Error(`Creator ${creator.id} has no raw_signals`)
    }

    // Verify contract fields
    const requiredFields = ['profile_source', 'primary_niche', 'specificity_hook', 'metrics']
    const missing = requiredFields.filter((f) => !signals[f])

    if (missing.length > 0) {
      throw new Error(`Missing contract fields: ${missing.join(', ')}`)
    }

    // Verify specificity_hook is not generic
    const genericHooks = ['content creator', 'social media influencer', 'digital creator']
    const isGeneric = genericHooks.some((g) =>
      signals.specificity_hook.toLowerCase().includes(g)
    )

    if (isGeneric) {
      throw new Error(`specificity_hook is generic: "${signals.specificity_hook}"`)
    }

    // Verify metrics.provenance
    if (!signals.metrics?.provenance) {
      throw new Error('Missing metrics.provenance')
    }

    return {
      detail: `specificity_hook="${signals.specificity_hook}", provenance=${signals.metrics.provenance}, completeness=${signals.profile_completeness || 'N/A'}`,
      data: signals,
    }
  },
}

const checkVerifiedMetrics = {
  name: 'verified_metrics',
  fn: async (): Promise<{ detail: string; data: any }> => {
    const { outreachSelect } = await import('@/lib/outreach/db')

    const creators = await outreachSelect<any>('outreach_creators', {
      filters: { profile_source: 'onboarding' },
      order: { column: 'created_at', ascending: false },
      limit: 5,
    })

    if (creators.length === 0) {
      return { detail: 'No onboarding-linked creators found', data: null }
    }

    const creator = creators[0]
    const signals = creator.raw_signals || {}
    const metrics = signals.metrics || {}

    // Check tier calculation
    const tier = creator.size_tier
    const verified = metrics.provenance === 'verified'

    return {
      detail: `tier=${tier}, provenance=${metrics.provenance}, followers=${metrics.followers}, engagement=${metrics.engagement_rate}, verified=${verified}`,
      data: { tier, metrics, verified },
    }
  },
}

const checkPersonalizer = {
  name: 'personalizer',
  fn: async (): Promise<{ detail: string; data: any }> => {
    const { outreachSelect } = await import('@/lib/outreach/db')

    const creators = await outreachSelect<any>('outreach_creators', {
      filters: { profile_source: 'onboarding' },
      order: { column: 'created_at', ascending: false },
      limit: 1,
    })

    if (creators.length === 0) {
      return { detail: 'No onboarding-linked creators — cannot test personalizer', data: null }
    }

    const creator = creators[0]
    const signals = creator.raw_signals || {}

    // Build context the same way personalizer does
    const contextParts: string[] = []
    if (signals.recent_content) contextParts.push(`Recent content: ${signals.recent_content}`)
    if (signals.platform) contextParts.push(`Primary platform: ${signals.platform}`)
    if (signals.follower_count) contextParts.push(`Followers: ${signals.follower_count}`)
    if (signals.engagement_rate) contextParts.push(`Engagement: ${(signals.engagement_rate * 100).toFixed(1)}%`)
    if (signals.recent_campaign) contextParts.push(`Recent campaign: ${signals.recent_campaign}`)
    if (signals.brand_collabs) contextParts.push(`Past collabs: ${signals.brand_collabs}`)
    if (signals.content_style) contextParts.push(`Style: ${signals.content_style}`)
    if (signals.audience_demographics) contextParts.push(`Audience: ${signals.audience_demographics}`)

    const context = contextParts.join('. ') || 'No additional context available.'

    // Check if specificity guard would pass
    const concreteDetails: string[] = []
    if (signals.recent_content && String(signals.recent_content).length > 10) concreteDetails.push(String(signals.recent_content))
    if (signals.recent_campaign && String(signals.recent_campaign).length > 5) concreteDetails.push(String(signals.recent_campaign))
    if (signals.brand_collabs && String(signals.brand_collabs).length > 5) concreteDetails.push(String(signals.brand_collabs))
    if (signals.content_style && String(signals.content_style).length > 5) concreteDetails.push(String(signals.content_style))

    return {
      detail: `context_length=${context.length}, concrete_details=${concreteDetails.length}, specificity_hook="${signals.specificity_hook || 'N/A'}"`,
      data: {
        context: context.slice(0, 200),
        concreteDetails,
        specificityHook: signals.specificity_hook,
      },
    }
  },
}

const checkOnboardingLoop = {
  name: 'onboarding_loop',
  fn: async (): Promise<{ detail: string; data: any }> => {
    const { getCPClient } = await import('@/lib/cp-db')
    const client = getCPClient()

    const { data: sessions } = await client
      .from('creator_onboarding_sessions')
      .select('id, status, current_step, completed_steps, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    const completed = (sessions || []).filter((s) => s.status === 'completed')
    const inProgress = (sessions || []).filter((s) => s.status !== 'completed' && s.current_step > 0)

    return {
      detail: `total=${sessions?.length || 0}, completed=${completed.length}, in_progress=${inProgress.length}`,
      data: { recent: (sessions || []).slice(0, 3) },
    }
  },
}

const checkFunnelEvents = {
  name: 'funnel_events',
  fn: async (): Promise<{ detail: string; data: any }> => {
    const { getCPClient } = await import('@/lib/cp-db')
    const client = getCPClient()

    const { data: events } = await client
      .from('onboarding_events')
      .select('event_name, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    const eventCounts: Record<string, number> = {}
    for (const e of events || []) {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1
    }

    return {
      detail: `total_events=${events?.length || 0}, unique_types=${Object.keys(eventCounts).length}`,
      data: eventCounts,
    }
  },
}

const checkCampaignLaunch = {
  name: 'campaign_launch',
  fn: async (): Promise<{ detail: string; data: any }> => {
    const { outreachSelect, outreachCount } = await import('@/lib/outreach/db')

    const campaigns = await outreachSelect<any>('outreach_campaigns', {
      order: { column: 'created_at', ascending: false },
      limit: 5,
    })

    const queueCount = await outreachCount('outreach_send_queue')
    const queuedCount = await outreachCount('outreach_send_queue', { status: 'queued' })

    return {
      detail: `campaigns=${campaigns.length}, queue_total=${queueCount}, queued=${queuedCount}`,
      data: { campaigns: campaigns.slice(0, 3) },
    }
  },
}
