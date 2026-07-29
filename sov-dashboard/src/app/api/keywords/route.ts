import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'
import { authorizeCampaignAccess } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')

    const { authorized, error: authError } = await authorizeCampaignAccess(req, campaignId)
    if (!authorized) return authError
    if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    let q = supabase.from('keywords').select('*').order('created_at', { ascending: false })
    if (campaignId) q = q.eq('campaign_id', campaignId)

    const { data: keywords, error } = await q

    if (error) {
      console.error('Keywords GET error:', error)
      return NextResponse.json({ error: error.message, keywords: [] }, { status: 500 })
    }

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

    return NextResponse.json({ keywords: enriched })
  } catch (e: any) {
    console.error('Keywords API error:', e)
    return NextResponse.json({ error: e.message, keywords: [] }, { status: 500 })
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

    let added = 0
    for (const kw of items) {
      if (!kw.text?.trim()) continue
      const { data, error } = await supabase
        .from('keywords')
        .upsert(
          { campaign_id: campaignId, text: kw.text.trim(), language: kw.language ?? 'en', category: kw.type ?? 'generic' },
          { onConflict: 'campaign_id,text', ignoreDuplicates: true }
        )
        .select('id')
        .maybeSingle()
      if (data && !error) added++
    }

    return NextResponse.json({ added }, { status: 201 })
  } catch (e: any) {
    console.error('Keywords POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await supabase.from('keywords').delete().eq('id', id)
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

    const { error } = await supabase.from('keywords').update(updates).eq('id', id)
    if (error) {
      console.error('Keywords PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Keywords PUT error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    await supabase.from('keywords').update({ status }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Keywords PATCH error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
