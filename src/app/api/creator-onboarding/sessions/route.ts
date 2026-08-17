import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { createOnboardingSession } from '@/lib/creator-onboarding'

/**
 * GET /api/creator-onboarding/sessions
 * List all onboarding sessions with optional filters.
 *
 * Query params:
 *   status: pending | in_progress | completed | expired
 *   search: email or name search
 *   page: page number (default 1)
 *   limit: per page (default 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const client = getCPClient()
    let query = client
      .from('creator_onboarding_sessions')
      .select('*', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`creator_email.ilike.%${search}%,creator_name.ilike.%${search}%,token.ilike.%${search}%`)
    }

    query = query.order('created_at', { ascending: false })

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Enrich with draft data
    const sessionIds = (data || []).map((s: any) => s.id)
    let drafts: Record<string, any> = {}

    if (sessionIds.length > 0) {
      const { data: draftData } = await client
        .from('creator_profile_drafts')
        .select('session_id, primary_niche, secondary_niches, youtube_handle, instagram_handle, rate_card, city, state')
        .in('session_id', sessionIds)

      for (const d of draftData || []) {
        drafts[d.session_id] = d
      }
    }

    const enriched = (data || []).map((s: any) => ({
      ...s,
      draft: drafts[s.id] || null,
    }))

    return NextResponse.json({
      sessions: enriched,
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
    const { action, email, name } = body

    if (action === 'create_test') {
      const testEmail = email || `test-creator-${Date.now()}@test.example.com`
      const testName = name || `Test Creator ${new Date().toLocaleTimeString()}`
      const session = await createOnboardingSession(testEmail, testName)
      return NextResponse.json({ session })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
