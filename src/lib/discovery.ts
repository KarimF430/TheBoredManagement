/**
 * Creator Discovery — Scoring & Tier Classification
 * Used by the scraper pipeline to filter creators through a two-pass system.
 * Pass 1: Profile quick filter (followers, posts, bio, privacy)
 * Pass 2: Post metrics deep filter (avg views, reach ratio)
 */

export interface CreatorScoreInput {
  name: string
  subscribers: number
  avg_views: number
  avg_likes: number
  avg_comments: number
  avg_engagement: number
}

export interface CreatorScoreResult {
  passed: boolean
  views_to_followers_ratio: number
  engagement_score: number
  reach_score: number
  total_score: number
  tier: string
  breakdown: {
    followers: { value: number; passed: boolean; reason: string }
    reach: { value: number; passed: boolean; reason: string }
    engagement: { value: number; passed: boolean; reason: string }
  }
}

/**
 * Score a creator based on their metrics.
 * The 40% reach rule is the primary filter:
 * - <10K followers: avg_views must be >= 30% of followers
 * - 10K-50K: avg_views must be >= 40% of followers
 * - 50K-500K: avg_views must be >= 20% of followers
 * - 500K+: avg_views must be >= 10% of followers
 */
export function scoreCreator(input: CreatorScoreInput): CreatorScoreResult {
  const { subscribers, avg_views, avg_likes, avg_comments, avg_engagement } = input

  // Views-to-followers ratio
  const views_to_followers_ratio = subscribers > 0 ? avg_views / subscribers : 0

  // Determine reach threshold based on follower tier
  let reachThreshold = 0.30
  if (subscribers >= 10000) reachThreshold = 0.40
  if (subscribers >= 50000) reachThreshold = 0.20
  if (subscribers >= 500000) reachThreshold = 0.10

  const reachPassed = views_to_followers_ratio >= reachThreshold

  // Engagement score (normalized 0-100)
  const engagement_score = Math.min(avg_engagement * 10, 100)

  // Reach score (normalized 0-100, capped at threshold)
  const reach_score = Math.min((views_to_followers_ratio / reachThreshold) * 100, 100)

  // Total score (weighted)
  const total_score = (reach_score * 0.6) + (engagement_score * 0.4)

  // Tier classification
  const tier = classifyTier(subscribers)

  // Passed if reach ratio meets threshold
  const passed = reachPassed && subscribers >= 5000

  return {
    passed,
    views_to_followers_ratio,
    engagement_score,
    reach_score,
    total_score,
    tier,
    breakdown: {
      followers: {
        value: subscribers,
        passed: subscribers >= 5000 && subscribers <= 2000000,
        reason: subscribers < 5000 ? 'Below 5K minimum' :
                subscribers > 2000000 ? 'Above 2M maximum' : 'Passes follower range',
      },
      reach: {
        value: views_to_followers_ratio,
        passed: reachPassed,
        reason: reachPassed
          ? `Reach ${(views_to_followers_ratio * 100).toFixed(1)}% >= ${(reachThreshold * 100).toFixed(0)}% threshold`
          : `Reach ${(views_to_followers_ratio * 100).toFixed(1)}% < ${(reachThreshold * 100).toFixed(0)}% threshold`,
      },
      engagement: {
        value: avg_engagement,
        passed: avg_engagement >= 1.0,
        reason: avg_engagement >= 1.0 ? 'Good engagement' : 'Low engagement',
      },
    },
  }
}

/**
 * Classify creator tier by follower count.
 */
export function classifyTier(followers: number): string {
  if (followers < 10000) return 'nano'
  if (followers < 50000) return 'micro'
  if (followers < 500000) return 'mid'
  if (followers < 1000000) return 'macro'
  return 'mega'
}

/**
 * Get reach threshold for a given follower count.
 */
export function getReachThreshold(followers: number): number {
  if (followers >= 500000) return 0.10
  if (followers >= 50000) return 0.20
  if (followers >= 10000) return 0.40
  return 0.30
}
