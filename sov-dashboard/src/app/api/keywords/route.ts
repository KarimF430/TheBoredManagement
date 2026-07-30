import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'
import { authorizeCampaignAccess } from '@/lib/auth'
import { dedupeKeywords, keywordDupeKey } from '@/lib/keyword-utils'
import { getCached, invalidateCampaign, CACHE_TTL, cacheKey } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')

    const { authorized, error: authError } = await authorizeCampaignAccess(req, campaignId)
    if (!authorized) return authError
    if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const keywords = await getCached(
      cacheKey.keywords(campaignId),
      () => fetchKeywords(campaignId),
      CACHE_TTL.keywords
    )
    return NextResponse.json({ keywords })
  } catch (e: any) {
    console.error('Keywords API error:', e)
    return NextResponse.json({ error: e.message, keywords: [] }, { status: 500 })
  }
}

async function fetchKeywords(campaignId: string) {
  const { data: keywords, error } = await supabase
    .from('keywords').select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  {

    // Batch aggregate: views, best rank, frequency per keyword
    const [aggRows, lastSeenRows] = await Promise.all([
      queryAll<{ keyword_id: string; total_views: number; best_rank: number; frequency: number }>(`
        SELECT
          kv.keyword_id,
          COALESCE(SUM(v.view_count), 0)::BIGINT as total_views,
          COALESCE(MIN(kv.rank), 99)::INT as best_rank,
          COUNT(*)::INT as frequency
        FROM keyword_videos kv
        JOIN videos v ON v.id = kv.video_id
        WHERE kv.campaign_id = $1 AND v.is_deleted = FALSE
        GROUP BY kv.keyword_id
      `, [campaignId]),
      queryAll<{ keyword_id: string; last_seen_at: string }>(`
        SELECT DISTINCT ON (keyword_id) keyword_id, last_seen_at
        FROM keyword_videos
        WHERE campaign_id = $1
        ORDER BY keyword_id, last_seen_at DESC
      `, [campaignId]),
    ])

    const aggMap = new Map(aggRows.map(r => [r.keyword_id, r]))
    const lastSeenMap = new Map(lastSeenRows.map(r => [r.keyword_id, r.last_seen_at]))

    const [kvCounts, ksCounts] = await Promise.all([
      queryAll<{ keyword_id: string; cnt: number }>(`
        SELECT keyword_id, COUNT(*)::INT as cnt
        FROM keyword_videos WHERE campaign_id = $1
        GROUP BY keyword_id
      `, [campaignId]),
      queryAll<{ keyword_id: string; cnt: number }>(`
        SELECT keyword_id, COUNT(*)::INT as cnt
        FROM keyword_shorts WHERE campaign_id = $1
        GROUP BY keyword_id
      `, [campaignId]),
    ])

    const kvCountMap = new Map(kvCounts.map(r => [r.keyword_id, r.cnt]))
    const ksCountMap = new Map(ksCounts.map(r => [r.keyword_id, r.cnt]))

    const enriched = (keywords || []).map((kw: any) => {
      const agg = aggMap.get(kw.id)
      return {
        ...kw,
        total_views: agg?.total_views || 0,
        best_rank: agg?.best_rank || 99,
        frequency: agg?.frequency || 0,
        long_form_count: kvCountMap.get(kw.id) || 0,
        short_form_count: ksCountMap.get(kw.id) || 0,
        last_scraped: lastSeenMap.get(kw.id) || kw.last_scraped_at || null,
      }
    })

    return enriched
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const items = Array.isArray(body.keywords)
      ? body.keywords
      : [{ text: body.text, language: body.language, type: body.type }]

    const campaignId = body.campaign_id

    const { authorized, error: authError } = await authorizeCampaignAccess(req, campaignId)
    if (!authorized) return authError
    if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('keywords')
      .select('text, language')
      .eq('campaign_id', campaignId)

    const incoming: { text: string; language: string; category: string }[] = items
      .filter((kw: any) => kw.text?.trim())
      .map((kw: any) => ({ text: kw.text as string, language: (kw.language ?? 'en') as string, category: (kw.type ?? kw.category ?? 'generic') as string }))

    const { unique, duplicates } = dedupeKeywords(incoming, existing ?? [])

    let added = 0
    for (const kw of unique) {
      const { data, error } = await supabase
        .from('keywords')
        .upsert(
          { campaign_id: campaignId, text: kw.text, language: kw.language, category: kw.category },
          { onConflict: 'campaign_id,text', ignoreDuplicates: true }
        )
        .select('id')
        .maybeSingle()
      if (data && !error) added++
    }

    if (added > 0) await invalidateCampaign(campaignId)

    return NextResponse.json({ added, skipped: duplicates.length, duplicates }, { status: 201 })
  } catch (e: any) {
    console.error('Keywords POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data: row } = await supabase.from('keywords').select('campaign_id').eq('id', id).maybeSingle()
    await supabase.from('keywords').delete().eq('id', id)
    if (row?.campaign_id) await invalidateCampaign(row.campaign_id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Keywords DELETE error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, text, language, category } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: any = {}
    if (text !== undefined) updates.text = text.trim()
    if (language !== undefined) updates.language = language
    if (category !== undefined) updates.category = category

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    if (updates.text || updates.language) {
      const { data: current } = await supabase
        .from('keywords').select('campaign_id, text, language').eq('id', id).maybeSingle()

      if (current) {
        const { data: siblings } = await supabase
          .from('keywords').select('id, text, language')
          .eq('campaign_id', current.campaign_id).neq('id', id)

        const key = keywordDupeKey(updates.text ?? current.text, updates.language ?? current.language)
        if ((siblings ?? []).some(s => keywordDupeKey(s.text, s.language) === key)) {
          return NextResponse.json({ error: 'A keyword with this text already exists in that language' }, { status: 409 })
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('keywords').update(updates).eq('id', id).select('campaign_id').maybeSingle()
    if (error) {
      console.error('Keywords PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (updated?.campaign_id) await invalidateCampaign(updated.campaign_id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Keywords PUT error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    const { data: updated } = await supabase
      .from('keywords').update({ status }).eq('id', id).select('campaign_id').maybeSingle()
    if (updated?.campaign_id) await invalidateCampaign(updated.campaign_id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Keywords PATCH error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
