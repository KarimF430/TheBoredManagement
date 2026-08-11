import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { analyzeSentiment, type SentimentResult } from '@/lib/sentiment'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const client = getCPClient()
    const url = new URL(req.url)
    const deliverableId = url.searchParams.get('deliverable_id')

    // Fetch comments from deliverables
    let query = client
      .from('cp_deliverables')
      .select('id, comments_raw, creator:cp_creators(channel_name)')
      .eq('campaign_id', campaignId)

    if (deliverableId) {
      query = query.eq('id', deliverableId)
    }

    const { data: deliverables, error } = await query
    if (error) throw error

    const allComments: string[] = []
    for (const d of deliverables || []) {
      if (d.comments_raw && Array.isArray(d.comments_raw)) {
        allComments.push(...(d.comments_raw as string[]))
      }
    }

    if (allComments.length === 0) {
      return NextResponse.json({
        sentiment: {
          overall: 'neutral', score: 0, positive: 0, negative: 0, neutral: 0,
          keyPhrases: [], summary: 'No comments available for analysis.', comments: [],
        } as SentimentResult,
      })
    }

    // Get brand name from campaign
    const { data: campaign } = await client
      .from('cp_campaigns')
      .select('brand')
      .eq('id', campaignId)
      .single()

    const sentiment = await analyzeSentiment(allComments, campaign?.brand || undefined)

    return NextResponse.json({ sentiment, commentCount: allComments.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
