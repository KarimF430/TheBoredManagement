import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = getCPClient()

    // Get creator pool info
    const { data: creator, error: creatorError } = await client
      .from('cp_creator_pool')
      .select('*')
      .eq('id', id)
      .single()

    if (creatorError) throw creatorError

    // Get campaign history
    const { data: history, error: historyError } = await client
      .from('cp_creator_history')
      .select('*')
      .eq('creator_pool_id', id)
      .order('created_at', { ascending: false })

    if (historyError) throw historyError

    // Get shortlist appearances
    const { data: shortlists } = await client
      .from('cp_creator_shortlist')
      .select('*, cp_campaigns(id, name, brand, status)')
      .eq('pool_creator_id', id)

    // Get commercials
    const { data: commercials } = await client
      .from('cp_creator_commercials')
      .select('*')
      .eq('creator_pool_id', id)
      .order('created_at', { ascending: false })

    // Calculate aggregate stats
    const totalCampaigns = new Set((history || []).map((h: Record<string, unknown>) => h.campaign_id)).size
    const totalEarnings = (history || []).reduce((sum: number, h: Record<string, unknown>) => sum + ((h.quoted_cost as number) || 0), 0)
    const totalViews = (history || []).reduce((sum: number, h: Record<string, unknown>) => sum + ((h.views as number) || 0), 0)
    const totalLikes = (history || []).reduce((sum: number, h: Record<string, unknown>) => sum + ((h.likes as number) || 0), 0)
    const avgEngagement = (history || []).length > 0
      ? (history || []).reduce((sum: number, h: Record<string, unknown>) => sum + ((h.engagement_rate as number) || 0), 0) / (history || []).length
      : 0

    const stats = {
      totalCampaigns,
      totalEarnings,
      totalViews,
      totalLikes,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      completedCampaigns: (history || []).filter((h: Record<string, unknown>) => h.outcome === 'completed').length,
      avgCampaignEarnings: totalCampaigns > 0 ? Math.round(totalEarnings / totalCampaigns) : 0,
    }

    return NextResponse.json({
      creator,
      history: history || [],
      shortlists: shortlists || [],
      commercials: commercials || [],
      stats,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const client = getCPClient()
    const { data, error } = await client
      .from('cp_creator_pool')
      .update({ ...body, updated_at: new Date().toISOString() })
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = getCPClient()

    const { error } = await client
      .from('cp_creator_pool')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
