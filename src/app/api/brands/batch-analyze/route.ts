import { NextRequest, NextResponse } from 'next/server'
import { queryAll, queryOne } from '@/lib/supabase'
import { fetchTranscript } from '@/lib/transcript'
import { analyzeBrandsFromTranscript, analyzeBrandsFromMetadata } from '@/lib/brand-analyzer'

/**
 * POST /api/brands/batch-analyze
 *
 * Background batch processor for thousands of videos.
 * Uses controlled concurrency (5 parallel LLM calls) instead of sequential processing.
 *
 * Flow:
 * 1. Frontend sends ALL video IDs
 * 2. API processes in background with concurrency limit
 * 3. Frontend polls GET /api/brands/batch-status for progress
 * 4. Results accumulate in database — no timeout risk
 */

// In-memory job tracking (resets on cold start, but DB is the source of truth)
const activeJobs = new Map<string, {
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  phase: string
  startedAt: number
  errors: Array<{ youtube_id: string; title: string; error: string }>
}>()

/** Export for batch-status endpoint to access job state. */
export function getJobStatus(jobId: string) {
  return activeJobs.get(jobId) || null
}

const CONCURRENCY = 5  // Parallel LLM calls (safe for OpenAI Tier 1: 500 RPM)
const BATCH_DELAY_MS = 200  // Small delay between batches to avoid hammering

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { video_ids, campaign_id, force = false } = body

    if (!video_ids || !Array.isArray(video_ids) || video_ids.length === 0) {
      return NextResponse.json({ error: 'video_ids array is required' }, { status: 400 })
    }
    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    const jobId = `batch-${campaign_id}-${Date.now()}`

    // Get campaign brands
    const brandRows = await queryAll('SELECT name FROM campaign_brands WHERE campaign_id = $1', [campaign_id])
    const campaignBrands = brandRows.map((r: any) => r.name)

    // Get video details
    const videos = await queryAll(
      `SELECT id, youtube_id, title, channel_name, description FROM videos WHERE youtube_id = ANY($1)`,
      [video_ids]
    )

    // Filter out already-analyzed videos (unless force)
    const videosToAnalyze: any[] = []
    let skippedCount = 0

    for (const video of videos) {
      if (!force) {
        const existing = await queryOne('SELECT brand_analysis_checked_at FROM videos WHERE id = $1', [video.id])
        if (existing?.brand_analysis_checked_at) {
          skippedCount++
          continue
        }
      }
      videosToAnalyze.push(video)
    }

    const total = videosToAnalyze.length
    if (total === 0) {
      return NextResponse.json({
        jobId,
        status: 'complete',
        total: videos.length,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: skippedCount,
        message: 'All videos already analyzed',
      })
    }

    // Initialize job tracker
    activeJobs.set(jobId, {
      total,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: skippedCount,
      phase: 'processing',
      startedAt: Date.now(),
      errors: [],
    })

    // Process in background — don't await
    processBatchJob(jobId, videosToAnalyze, campaignBrands, campaign_id, force).catch(err => {
      console.error(`[BatchAnalyze] Job ${jobId} failed:`, err)
      const job = activeJobs.get(jobId)
      if (job) job.phase = 'error'
    })

    return NextResponse.json({
      jobId,
      status: 'started',
      total: videos.length,
      toAnalyze: total,
      skipped: skippedCount,
      message: `Batch started. Poll GET /api/brands/batch-status?jobId=${jobId} for progress.`,
    })
  } catch (err: any) {
    console.error('Batch analysis error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * Process videos with controlled concurrency.
 * Runs in background — writes results directly to database.
 */
async function processBatchJob(
  jobId: string,
  videos: any[],
  campaignBrands: string[],
  campaignId: string,
  force: boolean
) {
  const job = activeJobs.get(jobId)
  if (!job) return

  // Process in chunks of CONCURRENCY
  for (let i = 0; i < videos.length; i += CONCURRENCY) {
    if (job.phase === 'cancelled') break

    const chunk = videos.slice(i, i + CONCURRENCY)

    // Process chunk in parallel
    const results = await Promise.allSettled(
      chunk.map(video => processOneVideo(video, campaignBrands, campaignId, force))
    )

    // Update job stats
    for (const result of results) {
      job.processed++
      if (result.status === 'fulfilled' && result.value.status === 'analyzed') {
        if ((result.value.brands_detected || 0) > 0) {
          job.success++
        } else {
          job.skipped++
        }
      } else {
        job.failed++
        const video = chunk[results.indexOf(result)]
        job.errors.push({
          youtube_id: video.youtube_id,
          title: video.title,
          error: result.status === 'rejected'
            ? (result.reason?.message || 'Unknown error')
            : (result.value.error || 'Failed'),
        })
      }
    }

    // Small delay between chunks to avoid rate limits
    if (i + CONCURRENCY < videos.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  job.phase = 'complete'
  console.log(`[BatchAnalyze] Job ${jobId} complete: ${job.success} brands, ${job.skipped} no brands, ${job.failed} failed`)
}

/**
 * Process a single video: fetch transcript + analyze + store results.
 */
async function processOneVideo(
  video: any,
  campaignBrands: string[],
  campaignId: string,
  force: boolean
): Promise<any> {
  // Fetch transcript (from cache or YouTube)
  let transcript = null
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

  let detections: any[] = []
  let source = 'transcript'
  let language = transcript?.language || 'en'

  if (!transcript || !transcript.text) {
    // Metadata fallback
    source = 'metadata'
    language = 'n/a'
    detections = await analyzeBrandsFromMetadata(
      video.title, video.channel_name || '', video.description || '',
      campaignBrands, undefined, { videoId: video.id, campaignId }
    )
  } else {
    detections = await analyzeBrandsFromTranscript(
      transcript.text, video.title, campaignBrands,
      video.channel_name || '', video.description || '',
      undefined, { videoId: video.id, campaignId }
    )
  }

  // Store results
  if (force) {
    await queryOne('DELETE FROM brand_analysis WHERE video_id = $1', [video.id])
  }

  const detectedBrands: string[] = []
  for (const d of detections) {
    await queryOne(
      `INSERT INTO brand_analysis (video_id, brand_name, confidence, mention_type, context_quotes)
       VALUES ($1, $2, $3, $4, $5)`,
      [video.id, d.brand_name, d.confidence, d.mention_type, d.context_quotes || []]
    )
    if (d.confidence >= 0.6) detectedBrands.push(d.brand_name)
  }

  // Update video tags
  if (detectedBrands.length > 0) {
    const videoRow = await queryOne('SELECT tags FROM videos WHERE id = $1', [video.id])
    const currentTags = Array.isArray(videoRow?.tags) ? videoRow.tags : []
    const mergedTags = [...new Set([...currentTags, ...detectedBrands])]
    await queryOne('UPDATE videos SET tags = $1, brand_analysis_checked_at = NOW() WHERE id = $2', [mergedTags, video.id])

    for (const brand of detectedBrands) {
      await queryOne(
        'INSERT INTO brand_tags (video_id, brand_name, campaign_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [video.id, brand, campaignId]
      )
    }
  } else {
    await queryOne('UPDATE videos SET brand_analysis_checked_at = NOW() WHERE id = $1', [video.id])
  }

  return {
    youtube_id: video.youtube_id,
    status: 'analyzed',
    source,
    language,
    transcript_length: transcript?.text?.length || 0,
    brands_detected: detections.length,
    high_confidence_brands: detectedBrands,
  }
}
