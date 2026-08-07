import { NextRequest, NextResponse } from 'next/server'
import { queryAll } from '@/lib/supabase'
import { scrapeKeyword } from '@/lib/scrape-pipeline-pg'
import { authorizeCampaignAccess } from '@/lib/auth'
import { invalidateCampaign } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, keyword_id, limit = 2, force = false } = await req.json()

    const { authorized, error } = await authorizeCampaignAccess(req, campaign_id, 'editor')
    if (!authorized) return error
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    // 1. Clean up any scrape_jobs stuck in 'running' for more than 5 minutes (from timed-out requests)
    await queryAll(
      `UPDATE scrape_jobs SET status = 'failed', error_msg = 'Timed out — request did not complete', completed_at = $1
       WHERE status = 'running' AND started_at < NOW() - INTERVAL '5 minutes'`,
      [new Date().toISOString()]
    )

    // 2. Build keyword filter — skip 12h check if keyword_id or force=true is provided
    let kwFilter = `AND status = 'active'`
    const params: any[] = [campaign_id]

    if (keyword_id) {
      kwFilter += ` AND id = $2`
      params.push(keyword_id)
    } else if (!force) {
      kwFilter += ` AND (last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '12 hours')`
    }

    const keywords = await queryAll<any>(
      `SELECT * FROM keywords WHERE campaign_id = $1 ${kwFilter}`,
      params
    )

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({
        ok: true,
        message: keyword_id
          ? 'Keyword not found or already scraped recently'
          : 'All active keywords were scraped within the last 12 hours. Nothing to do.',
        results: [],
        remaining: 0,
        total: 0,
      })
    }

    // 3. Check for available API keys.
    const today = new Date().toISOString().split('T')[0]
    await queryAll(`UPDATE api_keys SET units_used = 0, reset_date = $1 WHERE reset_date < $1 AND is_active = TRUE`, [today]).catch(() => {})

    const keys = await queryAll<any>(
      `SELECT id FROM api_keys WHERE is_active = TRUE AND (units_used + 5) <= units_limit`
    )

    if (!keys || keys.length === 0) {
      return NextResponse.json({ error: 'NO_API_KEYS: All API keys are exhausted for today' }, { status: 503 })
    }

    // 4. Process batch in parallel
    const batch = keywords.slice(0, Math.min(limit, keywords.length))
    const remaining = keywords.length - batch.length

    const scrapeJobs = batch.map(async (kw: any) => {
      const jobId = `scrape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      await queryAll(
        `INSERT INTO scrape_jobs (id, campaign_id, keyword_id, keyword_text, status, job_type, started_at)
         VALUES ($1, $2, $3, $4, 'running', 'keyword_scrape', $5)`,
        [jobId, campaign_id, kw.id, kw.text, new Date().toISOString()]
      )

      try {
        const result = await scrapeKeyword(campaign_id, kw.id, kw.text, { archiveBefore: true })
        await queryAll(
          `UPDATE scrape_jobs SET status = 'completed', results_count = $1, quota_used = $2, completed_at = $3 WHERE id = $4`,
          [result.ranked, result.quota_cost, new Date().toISOString(), jobId]
        )
        return {
          keyword: kw.text,
          keyword_id: kw.id,
          ranked: result.ranked,
          quota_cost: result.quota_cost,
          long_form: result.long_form ?? 0,
          short_form: result.short_form ?? 0,
          pages_fetched: result.pages_fetched ?? 0,
          rejected_foreign: result.rejected_foreign ?? 0,
          rejected_brand: result.rejected_brand ?? 0,
          rejected_irrelevant: result.rejected_irrelevant ?? 0,
          saved: result.saved ?? 0,
          pool_added: result.pool_added ?? 0,
        }
      } catch (err: any) {
        console.error(`Scrape failed for keyword "${kw.text}":`, err)
        await queryAll(
          `UPDATE scrape_jobs SET status = 'failed', error_msg = $1, completed_at = $2 WHERE id = $3`,
          [err.message?.substring(0, 500) || 'Unknown error', new Date().toISOString(), jobId]
        )
        return { keyword: kw.text, keyword_id: kw.id, ranked: 0, quota_cost: 0, error: err.message?.substring(0, 200) }
      }
    })

    const results = await Promise.all(scrapeJobs)

    const totalRanked = results.reduce((s, r) => s + r.ranked, 0)
    const totalQuota = results.reduce((s, r) => s + r.quota_cost, 0)

    // Clean up stale pool entries: remove videos from campaign_videos that
    // are no longer ranked by any keyword for this campaign.
    try {
      await queryAll(
        `DELETE FROM campaign_videos WHERE campaign_id = $1
         AND video_id NOT IN (
           SELECT video_id FROM keyword_videos WHERE campaign_id = $1
           UNION
           SELECT video_id FROM keyword_shorts WHERE campaign_id = $1
         )`,
        [campaign_id]
      )
    } catch (e) {
      console.error('Pool cleanup after scrape failed (non-fatal):', e)
    }

    // Invalidate stale overview & leaderboard caches for this campaign
    await invalidateCampaign(campaign_id)

    // Trigger background AI Brand Analysis for newly ranked videos
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${appUrl}/api/brands/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id, force: false }),
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      message: remaining > 0
        ? `Scraped ${results.length} of ${keywords.length} keyword(s). ${remaining} remaining — call again to continue.`
        : `Scraped ${results.length} keyword(s): ${totalRanked} videos ranked, ${totalQuota} quota units used.`,
      results,
      remaining,
      total: keywords.length,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    const campaignFilter = campaignId ? `WHERE campaign_id = $1` : ''
    const params = campaignId ? [campaignId] : []

    const jobs = await queryAll<any>(
      `SELECT * FROM scrape_jobs ${campaignFilter} ORDER BY created_at DESC LIMIT 50`,
      params
    )

    const statsData = await queryAll<any>(`SELECT status, results_count, quota_used FROM scrape_jobs`)

    const stats = {
      total: statsData?.length || 0,
      running: statsData?.filter((j: any) => j.status === 'running').length || 0,
      completed: statsData?.filter((j: any) => j.status === 'completed').length || 0,
      failed: statsData?.filter((j: any) => j.status === 'failed').length || 0,
      total_results: statsData?.reduce((sum: number, j: any) => sum + (j.results_count || 0), 0) || 0,
      total_quota_used: statsData?.reduce((sum: number, j: any) => sum + (j.quota_used || 0), 0) || 0,
    }

    return NextResponse.json({ jobs, stats })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
