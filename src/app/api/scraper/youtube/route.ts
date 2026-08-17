import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { runYouTubeScrape, type ScrapeJobConfig, type FilterOptions } from '@/lib/youtube-scraper'

/**
 * POST /api/scraper/youtube
 * Create and optionally start a YouTube scrape job.
 *
 * Body: {
 *   keyword: string,           // Search keyword or seed channel URL
 *   mode: 'keyword_channels' | 'keyword_videos' | 'channel_crawl',
 *   maxChannels?: number,      // Max channels to scrape (default 200)
 *   regionCode?: string,       // Region code (default 'IN')
 *   filter?: FilterOptions,    // Custom filter thresholds
 *   autoStart?: boolean,       // Start immediately (default true)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const keyword = body.keyword?.trim()
    if (!keyword) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 })
    }

    const mode = body.mode || 'keyword_videos'
    const maxChannels = Math.min(body.maxChannels || 200, 1000)
    const regionCode = body.regionCode || 'IN'
    const autoStart = body.autoStart !== false

    const filter: FilterOptions = {
      minSubscribers: body.filter?.minSubscribers ?? 5000,
      maxSubscribers: body.filter?.maxSubscribers ?? 5_000_000,
      minAvgViews: body.filter?.minAvgViews ?? 1000,
      minEngagement: body.filter?.minEngagement ?? 1.0,
      excludeCountries: body.filter?.excludeCountries ?? [],
    }

    const cp = getCPClient()

    // Create job record
    const { data: job, error: jobError } = await cp
      .from('cp_scrape_jobs')
      .insert({
        seed_handle: keyword,
        depth: mode === 'channel_crawl' ? 2 : 1,
        max_profiles: maxChannels,
        status: autoStart ? 'pending' : 'paused',
        checkpoint: {
          platform: 'youtube',
          mode,
          regionCode,
          filter,
        },
      })
      .select()
      .single()

    if (jobError) throw jobError

    if (autoStart) {
      // Start scrape in background (non-blocking)
      const config: ScrapeJobConfig = {
        keyword,
        mode,
        maxChannels,
        regionCode,
        filter,
      }

      runYouTubeScrape(job.id, config).catch(err => {
        console.error(`YouTube scrape job ${job.id} failed:`, err)
      })

      return NextResponse.json({
        ok: true,
        job,
        message: 'YouTube scrape job created and started',
      })
    }

    return NextResponse.json({
      ok: true,
      job,
      message: 'YouTube scrape job created (paused)',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/scraper/youtube
 * List YouTube scrape jobs and their results.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'jobs'
    const cp = getCPClient()

    if (action === 'jobs') {
      const { data: jobs } = await cp
        .from('cp_scrape_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      // Filter to YouTube jobs only
      const ytJobs = (jobs || []).filter((j: any) =>
        j.checkpoint?.platform === 'youtube' || j.seed_handle?.startsWith('yt:')
      )

      return NextResponse.json({ jobs: ytJobs })
    }

    if (action === 'results') {
      const jobId = searchParams.get('jobId')
      let query = cp.from('cp_raw_creators').select('*', { count: 'exact' })

      if (jobId) {
        query = query.eq('source_job_id', jobId)
      }
      query = query.eq('source', 'youtube_api')
      query = query.order('followers', { ascending: false })

      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
      const offset = parseInt(searchParams.get('offset') || '0')
      query = query.range(offset, offset + limit - 1)

      const { data, count } = await query
      return NextResponse.json({ results: data || [], total: count || 0 })
    }

    if (action === 'filtered') {
      const { data, count } = await cp
        .from('cp_filtered_creators')
        .select('*', { count: 'exact' })
        .not('email', 'is', null)
        .order('followers', { ascending: false })
        .limit(100)

      return NextResponse.json({ results: data || [], total: count || 0 })
    }

    if (action === 'stats') {
      const [rawCount, filteredCount, jobCount] = await Promise.all([
        cp.from('cp_raw_creators').select('*', { count: 'exact', head: true }).eq('source', 'youtube_api'),
        cp.from('cp_filtered_creators').select('*', { count: 'exact', head: true }).eq('source', 'youtube_api'),
        cp.from('cp_scrape_jobs').select('*', { count: 'exact', head: true }).eq('checkpoint->>platform', 'youtube'),
      ])

      return NextResponse.json({
        rawCount: rawCount.count || 0,
        filteredCount: filteredCount.count || 0,
        jobCount: jobCount.count || 0,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
