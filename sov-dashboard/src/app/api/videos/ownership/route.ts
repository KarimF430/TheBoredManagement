import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authorizeCampaignAccess } from '@/lib/auth'
import { invalidateCampaign } from '@/lib/cache'

export const runtime = 'nodejs'

// PATCH /api/videos/ownership — toggle is_ours for a video in a campaign
export async function PATCH(req: NextRequest) {
  try {
    const { video_id, is_ours, campaign_id } = await req.json()
    if (!video_id) return NextResponse.json({ error: 'video_id required' }, { status: 400 })
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const { authorized, error } = await authorizeCampaignAccess(req, campaign_id)
    if (!authorized) return error

    // Update campaign_videos for this campaign
    const { error: vErr } = await supabase
      .from('campaign_videos')
      .update({ is_ours: !!is_ours })
      .eq('video_id', video_id)
      .eq('campaign_id', campaign_id)
    if (vErr) throw vErr

    // Sync global videos.is_ours: set true if any campaign has it, false if none
    if (is_ours) {
      await supabase
        .from('videos')
        .update({ is_ours: true })
        .eq('id', video_id)
    } else {
      const { data: otherCampaigns } = await supabase
        .from('campaign_videos')
        .select('campaign_id')
        .eq('video_id', video_id)
        .eq('is_ours', true)
        .limit(1)
      if (!otherCampaigns?.length) {
        await supabase
          .from('videos')
          .update({ is_ours: false })
          .eq('id', video_id)
      }
    }

    await invalidateCampaign(campaign_id)

    return NextResponse.json({ ok: true, video_id, is_ours: !!is_ours })
  } catch (e: any) {
    console.error('Ownership toggle error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/videos/ownership — bulk toggle
export async function POST(req: NextRequest) {
  try {
    const { video_ids, is_ours, campaign_id } = await req.json()
    if (!video_ids?.length) return NextResponse.json({ error: 'video_ids required' }, { status: 400 })
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const { authorized, error } = await authorizeCampaignAccess(req, campaign_id)
    if (!authorized) return error

    const { error: vErr } = await supabase
      .from('campaign_videos')
      .update({ is_ours: !!is_ours })
      .in('video_id', video_ids)
      .eq('campaign_id', campaign_id)
    if (vErr) throw vErr

    // Bulk sync global is_ours
    if (is_ours) {
      await supabase.from('videos').update({ is_ours: true }).in('id', video_ids)
    } else {
      // For each video, check if any other campaign still has it as ours
      const BATCH = 50
      for (let i = 0; i < video_ids.length; i += BATCH) {
        const batch = video_ids.slice(i, i + BATCH)
        const { data: stillOurs } = await supabase
          .from('campaign_videos')
          .select('video_id')
          .in('video_id', batch)
          .eq('is_ours', true)
          .neq('campaign_id', campaign_id)
        const stillOursSet = new Set((stillOurs || []).map(r => r.video_id))
        const toUnset = batch.filter((v: string) => !stillOursSet.has(v))
        if (toUnset.length > 0) {
          await supabase.from('videos').update({ is_ours: false }).in('id', toUnset)
        }
      }
    }

    await invalidateCampaign(campaign_id)

    return NextResponse.json({ ok: true, count: video_ids.length, is_ours: !!is_ours })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
