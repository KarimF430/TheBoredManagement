import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    const type = searchParams.get('type') || 'all'

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const client = getCPClient()
    const results: Array<{ type: string; id: string; title: string; subtitle: string; url: string }> = []
    const pattern = `%${q}%`

    if (type === 'all' || type === 'campaigns') {
      const { data } = await client
        .from('cp_campaigns')
        .select('id, name, brand, status')
        .or(`name.ilike.${pattern},brand.ilike.${pattern}`)
        .limit(10)

      for (const c of data || []) {
        results.push({
          type: 'campaign',
          id: c.id,
          title: c.name,
          subtitle: `${c.brand} — ${c.status}`,
          url: `/campaigns/${c.id}`,
        })
      }
    }

    if (type === 'all' || type === 'creators') {
      const { data } = await client
        .from('cp_creators')
        .select('id, channel_name, channel_url, campaign_id, platform')
        .or(`channel_name.ilike.${pattern},channel_url.ilike.${pattern}`)
        .limit(10)

      for (const c of data || []) {
        results.push({
          type: 'creator',
          id: c.id,
          title: c.channel_name,
          subtitle: `${c.platform} — ${c.channel_url}`,
          url: `/campaigns/${c.campaign_id}/shortlist`,
        })
      }
    }

    if (type === 'all' || type === 'deliverables') {
      const { data } = await client
        .from('cp_deliverables')
        .select('id, campaign_id, platform, live_link, status')
        .or(`live_link.ilike.${pattern}`)
        .limit(10)

      for (const d of data || []) {
        results.push({
          type: 'deliverable',
          id: d.id,
          title: `${d.platform} deliverable`,
          subtitle: d.live_link || d.status,
          url: `/campaigns/${d.campaign_id}/content`,
        })
      }
    }

    results.sort((a, b) => a.title.localeCompare(b.title))

    return NextResponse.json({ results: results.slice(0, 25) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
