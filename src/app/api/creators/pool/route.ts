import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    const niche = searchParams.get('niche')
    const minFollowers = searchParams.get('min_followers')
    const maxFollowers = searchParams.get('max_followers')
    const minViews = searchParams.get('min_views')
    const platform = searchParams.get('platform')
    const tier = searchParams.get('tier')
    const status = searchParams.get('status') || 'active'
    const sortBy = searchParams.get('sort') || 'name'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const client = getCPClient()
    let query = client.from('cp_creator_pool').select('*', { count: 'exact' })

    if (status !== 'all') query = query.eq('status', status)
    if (niche) query = query.contains('niche', [niche])
    if (tier) query = query.eq('tier', tier)
    if (minFollowers) query = query.gte('subscribers', parseInt(minFollowers))
    if (maxFollowers) query = query.lte('subscribers', parseInt(maxFollowers))
    if (minViews) query = query.gte('avg_views', parseInt(minViews))
    if (q) {
      query = query.or(`name.ilike.%${q}%,youtube_handle.ilike.%${q}%,instagram_handle.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const validSorts: Record<string, { column: string; ascending: boolean }> = {
      name: { column: 'name', ascending: true },
      subscribers: { column: 'subscribers', ascending: false },
      avg_views: { column: 'avg_views', ascending: false },
      engagement: { column: 'avg_engagement', ascending: false },
      created: { column: 'created_at', ascending: false },
    }
    const sort = validSorts[sortBy] || validSorts.name
    query = query.order(sort.column, { ascending: sort.ascending })

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      creators: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const client = getCPClient()

    const { data, error } = await client
      .from('cp_creator_pool')
      .insert({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        location: body.location || null,
        languages: body.languages || [],
        youtube_url: body.youtube_url || null,
        youtube_handle: body.youtube_handle || null,
        youtube_channel_id: body.youtube_channel_id || null,
        instagram_url: body.instagram_url || null,
        instagram_handle: body.instagram_handle || null,
        tiktok_url: body.tiktok_url || null,
        twitter_url: body.twitter_url || null,
        niche: body.niche || [],
        sub_niche: body.sub_niche || [],
        content_type: body.content_type || [],
        subscribers: body.subscribers || 0,
        avg_views: body.avg_views || 0,
        avg_engagement: body.avg_engagement || 0,
        avg_likes: body.avg_likes || 0,
        avg_comments: body.avg_comments || 0,
        total_videos: body.total_videos || 0,
        total_views: body.total_views || 0,
        country: body.country || null,
        city: body.city || null,
        gender: body.gender || null,
        age_range: body.age_range || null,
        languages_spoken: body.languages_spoken || [],
        rate_card: body.rate_card || {},
        internal_rate: body.internal_rate || 0,
        tier: body.tier || 'micro',
        brand_safety: body.brand_safety || 'safe',
        notes: body.notes || null,
        tags: body.tags || [],
        source: body.source || 'manual',
        added_by: body.added_by || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ creator: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const client = getCPClient()
    const { data, error } = await client
      .from('cp_creator_pool')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ creator: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
