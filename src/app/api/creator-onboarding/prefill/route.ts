/**
 * AI Pre-Fill Endpoint
 *
 * Runs GPT-4o mini to guess creator's niche, tone, and content format
 * from bio/captions/titles. Confidence-gated: only surfaces high-confidence
 * guesses. Low confidence → silent fallback to normal selection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { classifyJson } from '@/lib/outreach/llm'
import { outreachConfig } from '@/lib/outreach/config'
import { getOnboardingSession } from '@/lib/creator-onboarding'

const PREFILL_SYSTEM = `You analyze a content creator's profile and predict their niche and style.
Return ONLY a JSON object with these fields:
{
  "primary_niche": "one of: Technology, Gaming, Fashion, Beauty, Fitness, Travel, Food & Cooking, Lifestyle, Comedy, Music, Dance, Art & Craft, Photography, Film & Cinematography, Education, Business & Entrepreneurship, Finance & Investment, Health & Wellness, News & Politics, Vlogs, Relationships, Parenting, Spirituality, Automobiles, Pets & Animals",
  "secondary_niches": ["up to 2 related niches"],
  "tone": "one of: casual, professional, humorous, educational, inspirational, dramatic",
  "content_format": "one of: short-form, long-form, mixed",
  "confidence": 0.0 to 1.0,
  "specificity_hook": "the single most specific, usable fact about this creator"
}
Be conservative with confidence. Only set high confidence (>=0.7) if the bio/content clearly indicates a specific niche.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, handle, bio: inputBio, recentTitles: inputRecentTitles, recentCaptions: inputRecentCaptions } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Verify session exists and is in progress
    const session = await getOnboardingSession(token)
    if (!session || !session.otp_verified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let bio = inputBio
    let recentTitles = inputRecentTitles
    let recentCaptions = inputRecentCaptions

    // If handle is provided but no context data is given, try fetching from YouTube API
    if (handle && !bio && (!recentTitles || recentTitles.length === 0)) {
      try {
        const { fetchYouTubeChannel, fetchChannelVideos } = await import('@/lib/youtube-api')
        const cleanHandle = handle.trim()
        const channelUrl = `https://youtube.com/${cleanHandle.startsWith('@') ? cleanHandle : '@' + cleanHandle}`
        
        const channel = await fetchYouTubeChannel(channelUrl)
        if (channel) {
          bio = channel.description
          const videos = await fetchChannelVideos(channel.id, 5)
          recentTitles = videos.map((v) => v.title)
          recentCaptions = videos.map((v) => v.description)
        }
      } catch (err) {
        console.error('Failed to pre-fetch YouTube channel for prefill:', err)
      }
    }

    // Build context string from available signals
    const contextParts: string[] = []
    if (bio) contextParts.push(`Bio: ${bio}`)
    if (recentTitles?.length) {
      contextParts.push(`Recent video titles: ${recentTitles.slice(0, 5).join('; ')}`)
    }
    if (recentCaptions?.length) {
      contextParts.push(`Recent captions: ${recentCaptions.slice(0, 3).join('; ')}`)
    }

    if (contextParts.length === 0) {
      return NextResponse.json({
        prefilled: false,
        reason: 'No bio or content data available for prediction',
      })
    }

    const user = `Predict this creator's niche and style based on:

${contextParts.join('\n')}

Return ONLY the JSON object. No prose.`

    const result = await classifyJson(PREFILL_SYSTEM, user, 400)

    if (!result.ok || !result.data) {
      // LLM failed → silent fallback (section 6)
      return NextResponse.json({
        prefilled: false,
        reason: 'LLM prediction failed',
      })
    }

    const data = result.data
    const confidence = typeof data.confidence === 'number' ? data.confidence : 0

    // Confidence gate: only surface high-confidence guesses
    if (confidence < outreachConfig.llm.minConfidenceToAct) {
      return NextResponse.json({
        prefilled: false,
        reason: `Low confidence (${(confidence * 100).toFixed(0)}%) — showing full selection`,
        confidence,
      })
    }

    return NextResponse.json({
      prefilled: true,
      prediction: {
        primary_niche: data.primary_niche || null,
        secondary_niches: Array.isArray(data.secondary_niches) ? data.secondary_niches : [],
        tone: data.tone || null,
        content_format: data.content_format || null,
        specificity_hook: data.specificity_hook || null,
      },
      confidence,
    })
  } catch (error: unknown) {
    // Silent fallback on any error
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({
      prefilled: false,
      reason: 'Pre-fill service unavailable',
    })
  }
}
