import { NextRequest, NextResponse } from 'next/server'
import { extractChannelId, fetchYouTubeChannel } from '@/lib/youtube-api'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  const channelId = extractChannelId(url)
  if (!channelId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })

  try {
    const channel = await fetchYouTubeChannel(url)
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    return NextResponse.json({
      title: channel.title,
      subscribers: channel.subscriberCount,
      avg_views: channel.viewCount ? Math.round(channel.viewCount / Math.max(channel.videoCount, 1)) : 0,
      engagement_rate: 0,
      platform: 'youtube',
      thumbnail: channel.thumbnailUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch YouTube data' }, { status: 500 })
  }
}
