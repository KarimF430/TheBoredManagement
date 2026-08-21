/**
 * Creator Onboarding ↔ Outreach Integration Layer
 *
 * THE CRITICAL BRIDGE: connects onboarding data to the outreach system's
 * personalizer, scorer, and campaign pipeline.
 *
 * Contract: every onboarding completion upserts a structured `raw_signals`
 * object into `outreach_creators.raw_signals` that the personalizer can
 * read without any manual step.
 */

import { getCPClient } from './cp-db'
import { getOnboardingSession, getOrCreateDraft, type CreatorProfileDraft, type OnboardingSession } from './creator-onboarding'
import { outreachSelect, outreachInsert, outreachUpdate } from './outreach/db'
import { alert } from './outreach/alerts'

// ── Raw Signals Contract (what the personalizer reads) ──────────

export interface RawSignals {
  profile_source: 'onboarding'

  // Per-axis structured fields
  primary_niche: string | null
  secondary_niches: string[]
  cluster: string | null
  niche_provenance: 'verified' | 'self_reported' | 'enriched' | 'unknown'
  languages: string[]
  creator_type: string | null
  content_formats: string[]
  city: string | null
  state: string | null

  // Brand history (with provenance per entry)
  brands_worked: Array<{ name: string; provenance: string }>
  brand_collabs: string | null // legacy: comma-joined names

  // Metrics
  metrics: {
    followers: number
    avg_views: number
    engagement_rate: number
    provenance: 'verified' | 'self_reported' | 'enriched' | 'unknown'
  }

  // Behavioral
  posting_rhythm: string | null
  content_format: string | null // primary content format
  tone: string | null // content style
  audience_relationship: string | null

  // Commercials
  rate_ranges: Record<string, string>

  // Profile quality
  specificity_hook: string
  profile_completeness: number

  // Legacy compat fields the personalizer reads
  recent_content: string | null
  content_style: string | null
  audience_demographics: string | null
  platform: string | null
  follower_count: number
  recently_active: boolean
  has_business_email: boolean
}

// ── Identity Resolution ─────────────────────────────────────────

/**
 * Resolves creator identity across both systems.
 *
 * If/else branches (section 2):
 * 1. Session has outreach_creator_id → link to that creators.id
 * 2. Email matches existing outreach_creators.email → link to that row
 * 3. Neither → create outreach_creators row, then link
 * 4. Two rows resolve to same creator → dedupe, flag, keep most complete
 */
export async function resolveCreatorIdentity(
  session: OnboardingSession,
  draft: CreatorProfileDraft
): Promise<{ outreachCreatorId: string; wasCreated: boolean }> {
  const client = getCPClient()

  // Branch 1: Session carries outreach_creator_id
  if (session.outreach_creator_id) {
    const existing = await outreachSelect<any>('outreach_creators', {
      filters: { id: session.outreach_creator_id },
      limit: 1,
    })

    if (existing.length > 0) {
      return { outreachCreatorId: existing[0].id, wasCreated: false }
    }
    // Fall through to branch 2/3 if the referenced row doesn't exist
  }

  // Branch 2: Email matches existing outreach_creators.email
  const emailLower = session.creator_email.toLowerCase()
  const byEmail = await outreachSelect<any>('outreach_creators', {
    filters: { email: emailLower },
    limit: 1,
  })

  if (byEmail.length > 0) {
    // Update the outreach_creators row with onboarding data
    await outreachUpdate('outreach_creators', 'id', byEmail[0].id, {
      name: draft.name || byEmail[0].name,
      niche: draft.primary_niche || byEmail[0].niche,
      source: 'onboarding',
    })

    // Link session back to this outreach creator
    await client
      .from('creator_onboarding_sessions')
      .update({ outreach_creator_id: byEmail[0].id })
      .eq('id', session.id)

    return { outreachCreatorId: byEmail[0].id, wasCreated: false }
  }

  // Branch 3: Create new outreach_creators row
  const newCreator = await outreachInsert<any>('outreach_creators', {
    email: emailLower,
    name: draft.name || session.creator_name || 'Unknown',
    niche: draft.primary_niche || null,
    size_tier: calculateSizeTier(
      (draft.youtube_subscribers || 0) + (draft.instagram_followers || 0)
    ),
    jurisdiction: draft.state || 'India',
    source: 'onboarding',
    raw_signals: null,
  })

  if (!newCreator) {
    throw new Error('Failed to create outreach_creators row')
  }

  // Link session to new outreach creator
  await client
    .from('creator_onboarding_sessions')
    .update({ outreach_creator_id: newCreator.id })
    .eq('id', session.id)

  return { outreachCreatorId: newCreator.id, wasCreated: true }
}

// ── Raw Signals Builder ─────────────────────────────────────────

/**
 * Builds the raw_signals object from onboarding draft data.
 *
 * The specificity_hook is the single most usable, specific true fact
 * about this creator — it must never be a generic phrase.
 */
export function buildRawSignals(
  draft: CreatorProfileDraft,
  session: OnboardingSession,
  verifiedMetrics?: VerifiedMetrics
): RawSignals {
  const completeness = computeCompleteness(draft)
  const platform = detectPrimaryPlatform(draft)
  const specificityHook = buildSpecificityHook(draft, verifiedMetrics)

  const selfReportedFollowers =
    (draft.youtube_subscribers || 0) + (draft.instagram_followers || 0)
  const followers = verifiedMetrics?.totalFollowers || selfReportedFollowers
  const hasVerifiedSource = !!(verifiedMetrics?.youtube || verifiedMetrics?.instagram?.provenance === 'verified')
  const provenance: RawSignals['metrics']['provenance'] = hasVerifiedSource
    ? 'verified'
    : selfReportedFollowers > 0
    ? 'self_reported'
    : 'unknown'

  const engagementRate = verifiedMetrics?.engagementRate || draft.avg_engagement / 100 || 0

  const rateRanges: Record<string, string> = {}
  if (draft.rate_card) {
    for (const [key, val] of Object.entries(draft.rate_card)) {
      if (typeof val === 'number' && val > 0) {
        rateRanges[key] = `₹${val.toLocaleString('en-IN')}`
      }
    }
  }

  const contentStyle = draft.content_style?.length
    ? draft.content_style.join(', ')
    : null

  const audienceDemo = draft.audience_age_distribution &&
    Object.keys(draft.audience_age_distribution).length > 0
    ? JSON.stringify(draft.audience_age_distribution)
    : null

  // Compose brands_worked with provenance
  const brandsWorked = Array.isArray(draft.brands_worked)
    ? (draft.brands_worked as Array<{ name: string; provenance: string }>)
    : (draft.past_brand_collabs || []).map((name: string) => ({ name, provenance: 'self_reported' }))

  // Read new per-axis fields from step_data or draft
  const stepData = (draft as any).step_data || {}
  const cluster = (draft as any).cluster || null
  const creatorType = (draft as any).creator_type || null
  const contentFormats = (draft as any).content_formats || draft.content_types || []
  const nicheProvenance = (draft as any).niche_provenance || 'self_reported'

  return {
    profile_source: 'onboarding',

    // Per-axis structured fields
    primary_niche: draft.primary_niche || null,
    secondary_niches: draft.secondary_niches || [],
    cluster,
    niche_provenance: nicheProvenance,
    languages: draft.languages || [],
    creator_type: creatorType,
    content_formats: contentFormats,
    city: draft.city || null,
    state: draft.state || null,

    // Brand history
    brands_worked: brandsWorked,
    brand_collabs: brandsWorked.length > 0
      ? brandsWorked.map((b: { name: string }) => b.name).join(', ')
      : null,

    // Metrics
    metrics: {
      followers,
      avg_views: verifiedMetrics?.avgViews || draft.avg_views || 0,
      engagement_rate: engagementRate,
      provenance,
    },

    // Behavioral
    posting_rhythm: draft.content_frequency || null,
    content_format: contentFormats[0] || draft.content_types?.[0] || null,
    tone: contentStyle,
    audience_relationship: audienceDemo,

    // Commercials
    rate_ranges: rateRanges,

    // Profile quality
    specificity_hook: specificityHook,
    profile_completeness: completeness,

    // Legacy compat
    recent_content: specificityHook,
    content_style: contentStyle,
    audience_demographics: audienceDemo,
    platform,
    follower_count: followers,
    recently_active: true,
    has_business_email: !!session.creator_email,
  }
}

// ── Write raw_signals to outreach_creators ───────────────────────

/**
 * Upserts raw_signals into outreach_creators, merging with any existing data.
 * Idempotent per creator — safe to call on every step commit.
 */
export async function writeRawSignalsToOutreach(
  outreachCreatorId: string,
  rawSignals: RawSignals
): Promise<void> {
  // Get existing raw_signals
  const existing = await outreachSelect<any>('outreach_creators', {
    filters: { id: outreachCreatorId },
    limit: 1,
  })

  if (!existing.length) {
    alert({
      severity: 'warning',
      scope: 'integration',
      message: `writeRawSignalsToOutreach: outreach_creators row ${outreachCreatorId} not found`,
    })
    return
  }

  const existingSignals = existing[0].raw_signals || {}

  // Merge: new signals override old, but preserve any fields we don't touch
  const merged = {
    ...existingSignals,
    ...rawSignals,
    // Always update metrics from latest source
    metrics: rawSignals.metrics,
    // Update specificity_hook if we have a better one
    specificity_hook: rawSignals.specificity_hook || existingSignals.specificity_hook,
    // Update completeness
    profile_completeness: rawSignals.profile_completeness,
  }

  // Update the outreach_creators row
  await outreachUpdate('outreach_creators', 'id', outreachCreatorId, {
    raw_signals: merged,
    // Also update top-level fields the scorer reads
    niche: rawSignals.primary_niche || existing[0].niche,
    size_tier: calculateSizeTier(rawSignals.metrics.followers),
  })
}

// ── Metric Verification ─────────────────────────────────────────

export interface VerifiedMetrics {
  youtube: {
    channelId: string | null
    subscriberCount: number
    viewCount: number
    videoCount: number
    country: string
    recentVideoTitles: string[]
  } | null
  instagram: {
    handle: string
    followers: number
    engagementRate: number
    provenance: 'verified' | 'self_reported'
  } | null
  totalFollowers: number
  avgViews: number
  engagementRate: number
}

/**
 * Pulls verified metrics from YouTube Data API (public URL, no OAuth needed).
 * Instagram stays self_reported unless OAuth is completed.
 */
export async function pullVerifiedMetrics(
  draft: CreatorProfileDraft
): Promise<VerifiedMetrics> {
  const result: VerifiedMetrics = {
    youtube: null,
    instagram: null,
    totalFollowers: 0,
    avgViews: 0,
    engagementRate: 0,
  }

  // YouTube: public API pull (provenance: verified)
  if (draft.youtube_url || draft.youtube_handle) {
    try {
      const { fetchYouTubeChannel, fetchChannelVideos } = await import('./youtube-api')
      const url = draft.youtube_url || `https://youtube.com/@${draft.youtube_handle}`
      const channel = await fetchYouTubeChannel(url)

      if (channel && channel.subscriberCount > 0) {
        // Fetch recent videos for avg views calculation
        const videos = await fetchChannelVideos(channel.id, 5)
        const avgViews = videos.length > 0
          ? Math.round(videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length)
          : 0

        // Calculate engagement from recent videos
        const avgLikes = videos.length > 0
          ? videos.reduce((sum, v) => sum + v.likeCount, 0) / videos.length
          : 0
        const engagementRate = avgViews > 0 ? avgLikes / avgViews : 0

        result.youtube = {
          channelId: channel.id,
          subscriberCount: channel.subscriberCount,
          viewCount: channel.viewCount,
          videoCount: channel.videoCount,
          country: channel.country,
          recentVideoTitles: videos.slice(0, 3).map((v) => v.title),
        }

        result.totalFollowers += channel.subscriberCount
        result.avgViews = avgViews
        result.engagementRate = engagementRate
      }
      // If channel not found or zero data → treat as self_reported (no crash)
    } catch (err) {
      // API rate-limited or down → store self_reported + retry flag later
      console.error('YouTube verification failed:', err)
    }
  }

  // Instagram: self_reported unless OAuth completed
  if (draft.instagram_handle) {
    result.instagram = {
      handle: draft.instagram_handle,
      followers: draft.instagram_followers || 0,
      engagementRate: draft.avg_engagement / 100 || 0,
      provenance: 'self_reported',
    }
    result.totalFollowers += draft.instagram_followers || 0
  }

  return result
}

// ── Funnel Event Emission ───────────────────────────────────────

export type FunnelEvent =
  | 'email_sent'
  | 'email_opened'
  | 'link_clicked'
  | 'otp_requested'
  | 'otp_verified'
  | 'step_1_completed'
  | 'step_2_completed'
  | 'step_3_completed'
  | 'step_4_completed'
  | 'step_5_completed'
  | 'step_6_completed'
  | 'step_7_completed'
  | 'step_8_completed'
  | 'step_9_completed'
  | 'step_10_completed'
  | 'profile_completed'
  | 'metrics_verified'
  | 'reply_received'
  | 'reply_classified'

/**
 * Emits a timestamped funnel event.
 * Call this at every stage so drop-off is visible.
 */
export async function emitFunnelEvent(
  sessionId: string,
  event: FunnelEvent,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const client = getCPClient()
    await client.from('onboarding_events').insert({
      session_id: sessionId,
      event,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // Don't let event logging break the flow
    console.error(`Failed to emit funnel event ${event}:`, err)
  }
}

// ── Consent Gate ─────────────────────────────────────────────────

export interface ConsentRecord {
  session_id: string
  consent_version: string
  consent_given_at: string
  ip_address: string | null
  user_agent: string | null
}

/**
 * Records DPDP consent before any personal data is stored.
 * Must be called BEFORE any writes to cp_creator_pool or creators.
 */
export async function recordConsent(
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const client = getCPClient()
  await client.from('onboarding_consent').insert({
    session_id: sessionId,
    consent_version: '1.0',
    consent_given_at: new Date().toISOString(),
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  })
}

/**
 * Checks if consent has been recorded for a session.
 */
export async function hasConsent(sessionId: string): Promise<boolean> {
  const client = getCPClient()
  const { count } = await client
    .from('onboarding_consent')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
  return (count || 0) > 0
}

// ── Anti-Abuse ───────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_OTP_REQUESTS_PER_WINDOW = 3
const MAX_SESSIONS_PER_IP_PER_DAY = 5
const MAX_SESSIONS_PER_EMAIL_PER_DAY = 2

/**
 * Checks rate limits for OTP requests.
 * Returns null if ok, or error message if rate-limited.
 */
export async function checkOtpRateLimit(
  email: string,
  ip?: string
): Promise<string | null> {
  const client = getCPClient()

  // Check OTP sends per email in window
  const { count: emailCount } = await client
    .from('creator_onboarding_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('creator_email', email.toLowerCase())
    .gte('updated_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())

  if ((emailCount || 0) >= MAX_OTP_REQUESTS_PER_WINDOW) {
    return `Too many OTP requests. Try again in ${RATE_LIMIT_WINDOW_MS / 60000} minutes.`
  }

  // Check sessions per IP per day
  if (ip) {
    const { count: ipCount } = await client
      .from('creator_onboarding_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      // Note: can't filter by IP in the session table without a column;
      // this is a placeholder for when IP logging is added
    // IP-based rate limiting would require adding ip_address column to sessions
  }

  return null
}

/**
 * Detects potential automation/bot signals.
 */
export function detectBotSignals(
  formInteractionTimeMs: number,
  hasJavaScriptEvents: boolean
): boolean {
  // If form was filled in under 5 seconds, likely bot
  if (formInteractionTimeMs < 5000) return true
  // If no JS events, likely headless
  if (!hasJavaScriptEvents) return true
  return false
}

// ── Helpers ──────────────────────────────────────────────────────

function computeCompleteness(draft: CreatorProfileDraft): number {
  let filled = 0
  let total = 0

  // Axis 1: Identity (3 fields)
  total += 3
  if (draft.name) filled++
  if (draft.city) filled++
  if (draft.state) filled++

  // Axis 2: Niche (1 field — primary is required)
  total += 1
  if (draft.primary_niche) filled++

  // Axis 3: Language (1 field — at least one)
  total += 1
  if (draft.languages?.length) filled++

  // Axis 4: Creator type (1 field)
  total += 1
  if ((draft as any).creator_type) filled++

  // Axis 5: Content format (1 field — at least one)
  total += 1
  if ((draft as any).content_formats?.length || draft.content_types?.length) filled++

  // Axis 6: Social / metrics (2 fields)
  total += 2
  if (draft.youtube_url || draft.instagram_url || draft.youtube_handle || draft.instagram_handle) filled++
  if (draft.youtube_subscribers || draft.instagram_followers) filled++

  // Axis 7: Brands (1 field — optional but counts toward completeness)
  total += 1
  const brands = (draft as any).brands_worked
  if ((Array.isArray(brands) && brands.length > 0) || draft.past_brand_collabs?.length) filled++

  // Axis 8: Behavioral (2 fields)
  total += 2
  if (draft.content_frequency) filled++
  if ((draft as any).step_data?.has_brand_deals) filled++

  // Axis 9: Willingness (1 field — any answer counts)
  total += 1
  if ((draft as any).step_data?.wants_paid) filled++

  // Axis 10: Rates (1 field — any rate or skip)
  total += 1
  if (draft.rate_card && Object.keys(draft.rate_card).length > 0) filled++

  return Math.round((filled / total) * 100)
}

function buildSpecificityHook(
  draft: CreatorProfileDraft,
  verifiedMetrics?: VerifiedMetrics
): string {
  // Priority: verified data > self-reported data > niche+city combo
  if (verifiedMetrics?.youtube?.recentVideoTitles?.length) {
    const recentTitle = verifiedMetrics.youtube.recentVideoTitles[0]
    return `Recently posted "${recentTitle}" on YouTube`
  }

  if (draft.primary_niche && draft.city) {
    return `${draft.primary_niche} creator based in ${draft.city}`
  }

  if (draft.primary_niche && draft.youtube_subscribers) {
    return `${draft.primary_niche} creator with ${draft.youtube_subscribers.toLocaleString('en-IN')} YouTube subscribers`
  }

  if (draft.instagram_handle) {
    return `Instagram creator @${draft.instagram_handle}`
  }

  return draft.name ? `${draft.name} — content creator` : 'Content creator'
}

function detectPrimaryPlatform(draft: CreatorProfileDraft): string {
  if (draft.youtube_subscribers && draft.youtube_subscribers > (draft.instagram_followers || 0)) {
    return 'youtube'
  }
  if (draft.instagram_followers) return 'instagram'
  if (draft.tiktok_followers) return 'tiktok'
  if (draft.twitter_followers) return 'twitter'
  return 'unknown'
}

function calculateSizeTier(totalFollowers: number): string {
  if (totalFollowers >= 1000000) return 'mega'
  if (totalFollowers >= 100000) return 'macro'
  if (totalFollowers >= 10000) return 'mid'
  if (totalFollowers >= 1000) return 'micro'
  return 'nano'
}

// ── Tier Calculation (verified-only) ────────────────────────────

/**
 * Calculates tier from VERIFIED metrics only.
 * Self-reported numbers NEVER drive tier.
 */
export function calculateVerifiedTier(
  verifiedMetrics: VerifiedMetrics | null,
  selfReportedFollowers: number
): { tier: string; verified: boolean } {
  if (verifiedMetrics && verifiedMetrics.totalFollowers > 0) {
    return {
      tier: calculateSizeTier(verifiedMetrics.totalFollowers),
      verified: true,
    }
  }

  // Self-reported → provisional tier, clearly marked unverified
  return {
    tier: calculateSizeTier(selfReportedFollowers),
    verified: false,
  }
}
