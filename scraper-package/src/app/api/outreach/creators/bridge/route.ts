import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { outreachSelect, outreachInsert } from '@/lib/outreach/db'

/**
 * Bridge API: Push creators from cp_filtered_creators (scraper) or cp_creator_pool (CRM)
 * into outreach_creators for use in the outreach pipeline.
 *
 * POST /api/outreach/creators/bridge
 * Body: { source: 'scraper' | 'crm' | 'both', limit?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const source = body.source || 'both'
    const limit = Math.min(body.limit || 500, 1000)

    const cp = getCPClient()
    let pushed = 0
    let skipped = 0
    let errors = 0

    // Get existing outreach emails for dedupe
    const existingCreators = await outreachSelect<any>('outreach_creators', {})
    const existingEmails = new Set(existingCreators.map((c: any) => c.email?.toLowerCase()))

    // Source 1: cp_filtered_creators (scraper output)
    if (source === 'scraper' || source === 'both') {
      const { data: filtered } = await cp
        .from('cp_filtered_creators')
        .select('*')
        .not('email', 'is', null)
        .neq('email', '')
        .order('followers', { ascending: false })
        .limit(limit)

      if (filtered) {
        for (const c of filtered) {
          const email = c.email?.toLowerCase()?.trim()
          if (!email || !email.includes('@') || existingEmails.has(email)) {
            skipped++
            continue
          }

          // Map scraper tier to outreach tier
          const tierMap: Record<string, string> = {
            nano: 'nano', micro: 'micro', mid: 'mid', macro: 'macro', mega: 'macro'
          }

          try {
            await outreachInsert('outreach_creators', {
              email,
              name: c.full_name || null,
              niche: c.category || null,
              size_tier: tierMap[c.tier || ''] || 'micro',
              jurisdiction: null,
              source: 'scraper',
              raw_signals: {
                handle: c.handle,
                followers: c.followers,
                avg_views: c.avg_views,
                engagement_rate: c.engagement_rate,
                profile_pic_url: c.profile_pic_url,
                is_verified: c.is_verified,
                raw_creator_id: c.id,
              },
            })
            existingEmails.add(email)
            pushed++
          } catch {
            errors++
          }
        }
      }
    }

    // Source 2: cp_creator_pool (CRM database)
    if (source === 'crm' || source === 'both') {
      const { data: pool } = await cp
        .from('cp_creator_pool')
        .select('*')
        .not('email', 'is', null)
        .neq('email', '')
        .eq('status', 'active')
        .order('subscribers', { ascending: false })
        .limit(limit)

      if (pool) {
        for (const c of pool) {
          const email = c.email?.toLowerCase()?.trim()
          if (!email || !email.includes('@') || existingEmails.has(email)) {
            skipped++
            continue
          }

          try {
            await outreachInsert('outreach_creators', {
              email,
              name: c.name || null,
              niche: Array.isArray(c.niche) ? c.niche[0] || null : c.niche || null,
              size_tier: c.tier || 'micro',
              jurisdiction: c.country || null,
              source: 'crm',
              raw_signals: {
                youtube_handle: c.youtube_handle,
                instagram_handle: c.instagram_handle,
                subscribers: c.subscribers,
                avg_views: c.avg_views,
                avg_engagement: c.avg_engagement,
                cp_creator_pool_id: c.id,
              },
            })
            existingEmails.add(email)
            pushed++
          } catch {
            errors++
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      pushed,
      skipped,
      errors,
      source,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
