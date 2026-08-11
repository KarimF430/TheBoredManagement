/**
 * Viewership Growth Curve
 * Tracks D1, D5, D10, D20, D40, D60, D90 performance per deliverable
 * as required by the campaign report spec
 */

export interface ViewershipDataPoint {
  day: number
  views: number
  likes: number
  comments: number
}

export interface ViewershipCurve {
  deliverableId: string
  creatorName: string
  platform: string
  liveDate: string
  dataPoints: ViewershipDataPoint[]
  totalViewsAtD90: number
  peakDay: number
  growthRate: number
}

const MILESTONE_DAYS = [1, 2, 3, 5, 7, 10, 14, 20, 30, 40, 50, 60, 75, 90]

export function buildViewershipCurve(
  snapshots: Array<{ snapshot_date: string; view_count: number; like_count: number; comment_count: number }>,
  liveDate: string
): ViewershipDataPoint[] {
  if (!snapshots || snapshots.length === 0) return []

  const liveTs = new Date(liveDate).getTime()
  const sorted = [...snapshots].sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime())

  const baseViews = sorted[0]?.view_count || 0
  const baseLikes = sorted[0]?.like_count || 0
  const baseComments = sorted[0]?.comment_count || 0

  return MILESTONE_DAYS.map(day => {
    const targetDate = liveTs + day * 86400000
    const closest = sorted.reduce((best, s) => {
      const diff = Math.abs(new Date(s.snapshot_date).getTime() - targetDate)
      const bestDiff = Math.abs(new Date(best.snapshot_date).getTime() - targetDate)
      return diff < bestDiff ? s : best
    }, sorted[sorted.length - 1])

    return {
      day,
      views: Math.max(0, (closest?.view_count || 0) - baseViews),
      likes: Math.max(0, (closest?.like_count || 0) - baseLikes),
      comments: Math.max(0, (closest?.comment_count || 0) - baseComments),
    }
  })
}

export function calculateCurveInsights(curve: ViewershipDataPoint[]): {
  peakDay: number
  growthRate: number
  isCompounding: boolean
} {
  if (curve.length < 2) return { peakDay: 1, growthRate: 0, isCompounding: false }

  let maxDailyGain = 0
  let peakDay = 1
  for (let i = 1; i < curve.length; i++) {
    const gain = curve[i].views - curve[i - 1].views
    if (gain > maxDailyGain) { maxDailyGain = gain; peakDay = curve[i].day }
  }

  const firstViews = curve[0].views || 1
  const lastViews = curve[curve.length - 1].views || 0
  const growthRate = ((lastViews - firstViews) / firstViews) * 100

  const laterGains = curve.slice(-3).reduce((s, d, i, arr) => s + (i > 0 ? d.views - arr[i - 1].views : 0), 0)
  const earlierGains = curve.slice(1, 4).reduce((s, d, i, arr) => s + (i > 0 ? d.views - arr[i - 1].views : 0), 0)
  const isCompounding = laterGains > earlierGains * 0.5

  return { peakDay, growthRate: Number(growthRate.toFixed(1)), isCompounding }
}
