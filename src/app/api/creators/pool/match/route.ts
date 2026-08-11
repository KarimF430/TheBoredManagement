import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

interface BriefRequirements {
  niche?: string[]
  minFollowers?: number
  maxFollowers?: number
  minViews?: number
  platforms?: string[]
  budget?: number
  tier?: string[]
  location?: string
  gender?: string
  contentTypes?: string[]
}

interface ScoredCreator {
  id: string
  name: string
  youtube_handle: string | null
  instagram_handle: string | null
  niche: string[]
  subscribers: number
  avg_views: number
  avg_engagement: number
  tier: string
  match_score: number
  match_reasons: string[]
  rate_card: Record<string, number>
}

function scoreCreator(creator: Record<string, unknown>, brief: BriefRequirements): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Niche match (0-30 points)
  const creatorNiche = (creator.niche as string[]) || []
  if (brief.niche && brief.niche.length > 0) {
    const nicheMatches = brief.niche.filter(n =>
      creatorNiche.some(cn => cn.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(cn.toLowerCase()))
    )
    if (nicheMatches.length > 0) {
      const nicheScore = Math.min(30, (nicheMatches.length / brief.niche.length) * 30)
      score += nicheScore
      reasons.push(`Niche match: ${nicheMatches.join(', ')}`)
    }
  }

  // Follower range (0-20 points)
  const subs = (creator.subscribers as number) || 0
  if (brief.minFollowers && subs >= brief.minFollowers) {
    score += 10
    reasons.push(`Meets min followers (${brief.minFollowers.toLocaleString()})`)
  }
  if (brief.maxFollowers && subs <= brief.maxFollowers) {
    score += 10
    reasons.push(`Within max followers (${brief.maxFollowers.toLocaleString()})`)
  }
  if (!brief.minFollowers && !brief.maxFollowers) score += 10

  // Views quality (0-20 points)
  const avgViews = (creator.avg_views as number) || 0
  if (brief.minViews && avgViews >= brief.minViews) {
    score += 20
    reasons.push(`Exceeds min views (${brief.minViews.toLocaleString()})`)
  } else if (avgViews > 0) {
    score += Math.min(15, (avgViews / (brief.minViews || 10000)) * 15)
    if (avgViews > 50000) reasons.push('Strong avg views')
  }

  // Engagement quality (0-15 points)
  const engagement = (creator.avg_engagement as number) || 0
  if (engagement > 5) { score += 15; reasons.push('High engagement (>5%)') }
  else if (engagement > 3) { score += 10; reasons.push('Good engagement (>3%)') }
  else if (engagement > 1) { score += 5; reasons.push('Moderate engagement') }

  // Tier match (0-10 points)
  const creatorTier = (creator.tier as string) || 'micro'
  if (brief.tier && brief.tier.includes(creatorTier)) {
    score += 10
    reasons.push(`Tier match: ${creatorTier}`)
  } else if (!brief.tier) {
    score += 5
  }

  // Platform availability (0-5 points)
  const rateCard = (creator.rate_card as Record<string, number>) || {}
  if (brief.platforms && brief.platforms.length > 0) {
    const hasPlatform = brief.platforms.some(p => rateCard[p] !== undefined)
    if (hasPlatform) {
      score += 5
      reasons.push('Platform available')
    }
  } else {
    score += 3
  }

  return { score: Math.min(100, Math.round(score)), reasons }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { brief, excludeCampaignId, limit = 20 } = body as {
      brief: BriefRequirements
      excludeCampaignId?: string
      limit?: number
    }

    const client = getCPClient()
    let query = client
      .from('cp_creator_pool')
      .select('*')
      .eq('status', 'active')

    if (brief.niche && brief.niche.length > 0) {
      query = query.overlaps('niche', brief.niche)
    }
    if (brief.minFollowers) query = query.gte('subscribers', brief.minFollowers)
    if (brief.maxFollowers) query = query.lte('subscribers', brief.maxFollowers)
    if (brief.tier && brief.tier.length > 0) {
      query = query.in('tier', brief.tier)
    }

    query = query.limit(200)

    const { data: creators, error } = await query
    if (error) throw error

    // If excludeCampaignId, filter out creators already in that campaign's shortlist
    let excludedIds: string[] = []
    if (excludeCampaignId) {
      const { data: shortlisted } = await client
        .from('cp_creator_shortlist')
        .select('pool_creator_id')
        .eq('campaign_id', excludeCampaignId)
      excludedIds = (shortlisted || []).map((s: Record<string, unknown>) => s.pool_creator_id as string)
    }

    const available = (creators || []).filter((c: Record<string, unknown>) => !excludedIds.includes(c.id as string))

    const scored: ScoredCreator[] = available.map((creator: Record<string, unknown>) => {
      const { score, reasons } = scoreCreator(creator, brief)
      return {
        id: creator.id as string,
        name: creator.name as string,
        youtube_handle: creator.youtube_handle as string | null,
        instagram_handle: creator.instagram_handle as string | null,
        niche: (creator.niche as string[]) || [],
        subscribers: (creator.subscribers as number) || 0,
        avg_views: (creator.avg_views as number) || 0,
        avg_engagement: (creator.avg_engagement as number) || 0,
        tier: (creator.tier as string) || 'micro',
        match_score: score,
        match_reasons: reasons,
        rate_card: (creator.rate_card as Record<string, number>) || {},
      }
    })

    scored.sort((a, b) => b.match_score - a.match_score)

    return NextResponse.json({
      matches: scored.slice(0, limit),
      total: scored.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
