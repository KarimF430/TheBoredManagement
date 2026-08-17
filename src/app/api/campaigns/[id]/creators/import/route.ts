/**
 * POST /api/campaigns/[id]/creators/import
 * Import filtered creators from the scraper pipeline into a campaign shortlist.
 * Also upserts them into the global creator pool.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

interface ImportBody {
  creator_ids?: string[]       // Import from cp_filtered_creators by ID
  pool_creator_ids?: string[]  // Import from cp_creator_pool by ID
  internal_cost?: number       // Default internal cost for all imported
  quoted_cost?: number         // Default quoted cost for all imported
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body: ImportBody = await req.json()
    const { creator_ids, pool_creator_ids, internal_cost = 0, quoted_cost = 0 } = body

    if (!creator_ids?.length && !pool_creator_ids?.length) {
      return NextResponse.json(
        { error: 'Provide creator_ids (from filtered) or pool_creator_ids (from pool)' },
        { status: 400 }
      )
    }

    const client = getCPClient()
    const results: { imported: number; skipped: number; errors: string[] } = {
      imported: 0,
      skipped: 0,
      errors: [],
    }

    // ── Import from cp_filtered_creators ──
    if (creator_ids?.length) {
      const { data: filtered, error: fetchErr } = await client
        .from('cp_filtered_creators')
        .select('*')
        .in('id', creator_ids)

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 })
      }

      for (const fc of filtered || []) {
        try {
          // 1. Upsert into cp_creator_pool
          const { data: poolCreator, error: poolErr } = await client
            .from('cp_creator_pool')
            .upsert({
              name: fc.full_name || fc.handle,
              email: fc.email,
              phone: fc.phone,
              instagram_handle: fc.handle,
              instagram_url: `https://instagram.com/${fc.handle}`,
              subscribers: fc.followers,
              avg_views: fc.avg_views,
              avg_likes: fc.avg_likes,
              avg_comments: fc.avg_comments,
              avg_engagement: fc.engagement_rate,
              tier: fc.tier || 'micro',
              source: 'scraper',
              status: 'active',
              profile_pic_url: fc.profile_pic_url,
            }, { onConflict: 'instagram_handle', ignoreDuplicates: false })
            .select('id')
            .single()

          if (poolErr) {
            results.errors.push(`Pool upsert failed for @${fc.handle}: ${poolErr.message}`)
            continue
          }

          // 2. Check if already shortlisted for this campaign
          const { data: existing } = await client
            .from('cp_creator_shortlist')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('pool_creator_id', poolCreator.id)
            .maybeSingle()

          if (existing) {
            results.skipped++
            continue
          }

          // 3. Insert into cp_creator_shortlist
          const { error: shortlistErr } = await client
            .from('cp_creator_shortlist')
            .insert({
              campaign_id: campaignId,
              pool_creator_id: poolCreator.id,
              quoted_cost: quoted_cost,
              internal_cost: internal_cost,
              status: 'shortlisted',
            })

          if (shortlistErr) {
            results.errors.push(`Shortlist insert failed for @${fc.handle}: ${shortlistErr.message}`)
            continue
          }

          // 4. Mark filtered creator as linked to campaign
          await client
            .from('cp_filtered_creators')
            .update({
              campaign_id: campaignId,
              shortlisted_at: new Date().toISOString(),
              outreach_status: 'not_contacted',
            })
            .eq('id', fc.id)

          results.imported++
        } catch (err) {
          results.errors.push(`Error importing @${fc.handle}: ${err instanceof Error ? err.message : 'Unknown'}`)
        }
      }
    }

    // ── Import from cp_creator_pool directly ──
    if (pool_creator_ids?.length) {
      for (const poolId of pool_creator_ids) {
        try {
          const { data: existing } = await client
            .from('cp_creator_shortlist')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('pool_creator_id', poolId)
            .maybeSingle()

          if (existing) {
            results.skipped++
            continue
          }

          const { error: shortlistErr } = await client
            .from('cp_creator_shortlist')
            .insert({
              campaign_id: campaignId,
              pool_creator_id: poolId,
              quoted_cost: quoted_cost,
              internal_cost: internal_cost,
              status: 'shortlisted',
            })

          if (shortlistErr) {
            results.errors.push(`Shortlist insert failed for pool ${poolId}: ${shortlistErr.message}`)
            continue
          }

          results.imported++
        } catch (err) {
          results.errors.push(`Error importing pool ${poolId}: ${err instanceof Error ? err.message : 'Unknown'}`)
        }
      }
    }

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: campaignId,
      actor_name: 'System',
      action_type: 'import',
      entity_type: 'creator',
      entity_name: `${results.imported} creators imported`,
      details: {
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors.length,
        source: creator_ids?.length ? 'scraper_pipeline' : 'creator_pool',
      },
    })

    return NextResponse.json({
      message: `Imported ${results.imported} creators, skipped ${results.skipped}`,
      ...results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
