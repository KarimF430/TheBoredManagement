import { NextRequest, NextResponse } from 'next/server'
import { queryAll, queryOne } from '@/lib/supabase'
import { fetchTranscript } from '@/lib/transcript'
import { analyzeBrandsFromTranscript, analyzeBrandsFromMetadata } from '@/lib/brand-analyzer'
import { RateLimiter } from '@/lib/retry'
import { invalidateCampaign } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Videos analyzed concurrently within one request. */
const CONCURRENCY = 5

/**
 * Stop starting new videos once this much of the request's time budget is
 * used, and report the rest as `remaining` instead of racing the platform's
 * hard timeout. This route already skips already-analyzed videos, so calling
 * it again with the same video_ids resumes cleanly — same pattern as
 * /api/scrape.
 */
const TIME_BUDGET_MS = 50_000

type AnalyzeStatus = 'already_analyzed' | 'analyzed' | 'skipped'

interface AnalyzeResult {
  youtube_id: string
  status: AnalyzeStatus
  source?: 'transcript' | 'metadata'
  language?: string
  transcript_length?: number
  brands_detected?: number
  high_confidence_brands?: string[]
}

async function persistDetections(
  videoId: string,
  campaignId: string,
  detections: Array<{ brand_name: string; confidence: number; mention_type: string; context_quotes?: string[] }>,
  force: boolean
): Promise<string[]> {
  if (force) {
    await queryOne('DELETE FROM brand_analysis WHERE video_id = $1', [videoId])
  }

  const detectedBrands: string[] = []
  for (const d of detections) {
    await queryOne(
      `INSERT INTO brand_analysis (video_id, brand_name, confidence, mention_type, context_quotes)
       VALUES ($1, $2, $3, $4, $5)`,
      [videoId, d.brand_name, d.confidence, d.mention_type, d.context_quotes || []]
    )
    if (d.confidence >= 0.6) detectedBrands.push(d.brand_name)
  }

  if (detectedBrands.length > 0) {
    const videoRow = await queryOne('SELECT tags FROM videos WHERE id = $1', [videoId])
    const currentTags = Array.isArray(videoRow?.tags) ? videoRow.tags : []
    const mergedTags = [...new Set([...currentTags, ...detectedBrands])]
    await queryOne('UPDATE videos SET tags = $1, brand_analysis_checked_at = NOW() WHERE id = $2', [mergedTags, videoId])

    for (const brand of detectedBrands) {
      await queryOne(
        'INSERT INTO brand_tags (video_id, brand_name, campaign_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [videoId, brand, campaignId]
      )
    }
  } else {
    // Zero brands found is still a completed analysis — mark it so this
    // video isn't mistaken for "never analyzed" and reprocessed (with a
    // real LLM call) on every future call. See migration 009.
    await queryOne('UPDATE videos SET brand_analysis_checked_at = NOW() WHERE id = $1', [videoId])
  }

  return detectedBrands
}

async function analyzeOneVideo(
  video: { id: string; youtube_id: string; title: string; channel_name: string; description: string },
  campaignId: string,
  campaignBrands: string[],
  force: boolean
): Promise<AnalyzeResult> {
  if (!force) {
    const existing = await queryOne('SELECT 1 FROM brand_analysis WHERE video_id = $1 LIMIT 1', [video.id])
    if (existing) {
      return { youtube_id: video.youtube_id, status: 'already_analyzed' }
    }
  }

  let transcript: { text: string; language: string } | null = null
  const existingTranscript = await queryOne(
    'SELECT transcript_text, language FROM video_transcripts WHERE video_id = $1', [video.id]
  )

  if (existingTranscript) {
    transcript = { text: existingTranscript.transcript_text, language: existingTranscript.language }
  } else {
    transcript = await fetchTranscript(video.youtube_id)
    if (transcript) {
      await queryOne(
        'INSERT INTO video_transcripts (video_id, transcript_text, language) VALUES ($1, $2, $3) ON CONFLICT (video_id) DO NOTHING',
        [video.id, transcript.text, transcript.language]
      )
    }
  }

  if (!transcript || !transcript.text) {
    const detections = await analyzeBrandsFromMetadata(video.title, video.channel_name || '', video.description || '', campaignBrands)
    const detectedBrands = await persistDetections(video.id, campaignId, detections, force)
    return {
      youtube_id: video.youtube_id, status: 'analyzed',
      source: 'metadata', language: 'n/a',
      brands_detected: detections.length, high_confidence_brands: detectedBrands,
    }
  }

  const detections = await analyzeBrandsFromTranscript(
    transcript.text, video.title, campaignBrands, video.channel_name || '', video.description || ''
  )
  const detectedBrands = await persistDetections(video.id, campaignId, detections, force)

  return {
    youtube_id: video.youtube_id, status: 'analyzed',
    source: 'transcript', transcript_length: transcript.text.length, language: transcript.language,
    brands_detected: detections.length, high_confidence_brands: detectedBrands,
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const body = await req.json()
    const { video_ids, campaign_id, force = false } = body

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    let targetVideoIds = video_ids
    if (!targetVideoIds || !Array.isArray(targetVideoIds) || targetVideoIds.length === 0) {
      const untagged = await queryAll<{ youtube_id: string }>(
        `SELECT v.youtube_id FROM videos v
         JOIN campaign_videos cv ON cv.video_id = v.id
         WHERE cv.campaign_id = $1 AND v.brand_analysis_checked_at IS NULL
         LIMIT 20`,
        [campaign_id]
      )
      targetVideoIds = untagged.map(u => u.youtube_id)
    }

    if (!targetVideoIds || targetVideoIds.length === 0) {
      return NextResponse.json({ ok: true, message: 'All campaign videos are already analyzed', results: [] })
    }

    const brandRows = await queryAll('SELECT name FROM campaign_brands WHERE campaign_id = $1', [campaign_id])
    const campaignBrands = brandRows.map((r: any) => r.name)

    const videos = await queryAll<{ id: string; youtube_id: string; title: string; channel_name: string; description: string }>(
      `SELECT id, youtube_id, title, channel_name, description FROM videos WHERE youtube_id = ANY($1)`,
      [targetVideoIds]
    )

    const results: AnalyzeResult[] = []
    const limiter = new RateLimiter(CONCURRENCY)
    let timeBudgetHit = false
    let i = 0

    // Chunked, concurrency-bounded processing with a time-budget circuit
    // breaker: start a batch, wait for it, then check elapsed time before
    // starting the next. A whole batch may run slightly over budget (the
    // check is between batches, not per-video), which is intentional —
    // simpler than pre-empting in-flight LLM calls and still bounded.
    while (i < videos.length && !timeBudgetHit) {
      const batch = videos.slice(i, i + CONCURRENCY)
      i += batch.length

      const batchResults = await Promise.all(
        batch.map(video =>
          limiter.run(() => analyzeOneVideo(video, campaign_id, campaignBrands, force))
            .catch((err): AnalyzeResult => {
              console.error(`Brand analysis failed for video ${video.youtube_id}:`, err)
              return { youtube_id: video.youtube_id, status: 'skipped' }
            })
        )
      )
      results.push(...batchResults)

      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        timeBudgetHit = true
      }
    }

    const remaining = videos.length - i

    // Invalidate campaign cache so leaderboard & overview reflect new brand tags immediately
    await invalidateCampaign(campaign_id)

    return NextResponse.json({
      results,
      remaining,
      total: videos.length,
      message: remaining > 0
        ? `Analyzed ${results.length} of ${videos.length} video(s). ${remaining} remaining — call again with the same video_ids to continue.`
        : `Analyzed ${results.length} video(s).`,
    })
  } catch (err: any) {
    console.error('Brand analysis error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get('video_id')
    const campaignId = searchParams.get('campaign_id')

    if (!videoId && !campaignId) {
      return NextResponse.json({ error: 'video_id or campaign_id required' }, { status: 400 })
    }

    if (videoId) {
      const analyses = await queryAll(`
        SELECT ba.*, v.youtube_id, v.title
        FROM brand_analysis ba JOIN videos v ON v.id = ba.video_id
        WHERE ba.video_id = $1 ORDER BY ba.confidence DESC
      `, [videoId])

      const transcript = await queryOne(
        'SELECT language, fetched_at FROM video_transcripts WHERE video_id = $1', [videoId]
      )
      return NextResponse.json({ analyses, transcript })
    }

    // Campaign-wide summary
    const summary = await queryAll(`
      SELECT ba.brand_name, COUNT(DISTINCT ba.video_id) as video_count, AVG(ba.confidence) as avg_confidence
      FROM brand_analysis ba
      JOIN videos v ON v.id = ba.video_id
      JOIN campaign_videos cv ON cv.video_id = v.id
      WHERE cv.campaign_id = $1
      GROUP BY ba.brand_name ORDER BY video_count DESC
    `, [campaignId])

    return NextResponse.json({ summary })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
