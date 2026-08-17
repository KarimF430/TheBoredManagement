/**
 * Creator Onboarding — Database Client
 * Wraps CP client for onboarding-specific tables
 */

import { getCPClient } from './cp-db'

export interface OnboardingSession {
  id: string
  token: string
  creator_email: string
  creator_name: string | null
  outreach_creator_id: string | null
  pool_creator_id: string | null
  current_step: number
  total_steps: number
  completed_steps: number[]
  otp_code: string | null
  otp_expires_at: string | null
  otp_verified: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  invited_at: string
  started_at: string | null
  completed_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

export interface CreatorProfileDraft {
  id: string
  session_id: string
  name: string | null
  phone: string | null
  whatsapp: string | null
  location: string | null
  city: string | null
  state: string | null
  gender: string | null
  age_range: string | null
  languages: string[]
  primary_niche: string | null
  secondary_niches: string[]
  sub_niches: string[]
  content_types: string[]
  youtube_url: string | null
  youtube_handle: string | null
  youtube_subscribers: number
  instagram_url: string | null
  instagram_handle: string | null
  instagram_followers: number
  tiktok_url: string | null
  tiktok_followers: number
  twitter_url: string | null
  twitter_handle: string | null
  twitter_followers: number
  other_social: Record<string, unknown>
  avg_views: number
  avg_engagement: number
  avg_likes: number
  avg_comments: number
  total_videos: number
  total_views: number
  audience_age_distribution: Record<string, unknown>
  audience_gender_distribution: Record<string, unknown>
  audience_location_distribution: Record<string, unknown>
  content_style: string[]
  brand_collab_preferences: string[]
  content_frequency: string | null
  preferred_platforms: string[]
  past_brand_collabs: string[]
  portfolio_url: string | null
  rate_card: Record<string, unknown>
  currency: string
  negotiable: boolean
  min_rate: number | null
  step_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NicheTaxonomy {
  id: string
  niche_name: string
  parent_niche: string | null
  sub_niches: string[]
  content_types: string[]
  icon: string | null
  display_order: number
  active: boolean
}

// ── Session Operations ──────────────────────────────────────────

export async function createOnboardingSession(
  email: string,
  name?: string,
  outreachCreatorId?: string
): Promise<OnboardingSession> {
  const client = getCPClient()
  const token = generateToken()

  const { data, error } = await client
    .from('creator_onboarding_sessions')
    .insert({
      token,
      creator_email: email,
      creator_name: name || null,
      outreach_creator_id: outreachCreatorId || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return data as OnboardingSession
}

export async function getOnboardingSession(
  token: string
): Promise<OnboardingSession | null> {
  const client = getCPClient()
  const { data, error } = await client
    .from('creator_onboarding_sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return null
  return data as OnboardingSession
}

export async function updateOnboardingSession(
  id: string,
  updates: Partial<Pick<OnboardingSession, 'current_step' | 'completed_steps' | 'status' | 'otp_verified' | 'started_at' | 'completed_at' | 'otp_code' | 'otp_expires_at' | 'pool_creator_id'>>
): Promise<OnboardingSession> {
  const client = getCPClient()
  const { data, error } = await client
    .from('creator_onboarding_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update session: ${error.message}`)
  return data as OnboardingSession
}

// ── Draft Operations ──────────────────────────────────────────

export async function getOrCreateDraft(
  sessionId: string
): Promise<CreatorProfileDraft> {
  const client = getCPClient()

  // Try to get existing draft
  const { data: existing } = await client
    .from('creator_profile_drafts')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (existing) return existing as CreatorProfileDraft

  // Create new draft
  const { data, error } = await client
    .from('creator_profile_drafts')
    .insert({ session_id: sessionId })
    .select()
    .single()

  if (error) throw new Error(`Failed to create draft: ${error.message}`)
  return data as CreatorProfileDraft
}

export async function updateDraft(
  sessionId: string,
  updates: Partial<Omit<CreatorProfileDraft, 'id' | 'session_id' | 'created_at' | 'updated_at'>>
): Promise<CreatorProfileDraft> {
  const client = getCPClient()
  const { data, error } = await client
    .from('creator_profile_drafts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update draft: ${error.message}`)
  return data as CreatorProfileDraft
}

// ── Niche Operations ──────────────────────────────────────────

export async function getNicheTaxonomy(): Promise<NicheTaxonomy[]> {
  const client = getCPClient()
  const { data, error } = await client
    .from('creator_niche_taxonomy')
    .select('*')
    .eq('active', true)
    .order('display_order')

  if (error) throw new Error(`Failed to fetch niches: ${error.message}`)
  return (data as NicheTaxonomy[]) || []
}

export async function getNicheByName(
  name: string
): Promise<NicheTaxonomy | null> {
  const client = getCPClient()
  const { data, error } = await client
    .from('creator_niche_taxonomy')
    .select('*')
    .eq('niche_name', name)
    .single()

  if (error || !data) return null
  return data as NicheTaxonomy
}

// ── Helpers ──────────────────────────────────────────

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(values)
    .map((v) => chars[v % chars.length])
    .join('')
}
