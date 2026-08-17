/**
 * YouTube Data API Integration
 * Auto-fetch channel metadata, video stats, and engagement
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  country: string
  customUrl: string
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
}

/**
 * Extract channel ID from various YouTube URL formats
 */
export function extractChannelId(url: string): string | null {
  // youtube.com/@handle
  const handleMatch = url.match(/youtube\.com\/@([^/?]+)/)
  if (handleMatch) return handleMatch[1]

  // youtube.com/channel/ID
  const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/)
  if (channelMatch) return channelMatch[1]

  // youtube.com/user/ID
  const userMatch = url.match(/youtube\.com\/user\/([^/?]+)/)
  if (userMatch) return userMatch[1]

  // youtube.com/c/ID
  const customMatch = url.match(/youtube\.com\/c\/([^/?]+)/)
  if (customMatch) return customMatch[1]

  return null
}

/**
 * Fetch channel metadata from YouTube API
 */
export async function fetchYouTubeChannel(channelUrl: string): Promise<YouTubeChannel | null> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY not set')
    return null
  }

  const channelId = extractChannelId(channelUrl)
  if (!channelId) return null

  try {
    // If it's a handle, we need to search first
    let searchId = channelId
    if (!channelId.startsWith('UC')) {
      const searchRes = await fetch(
        `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(channelId)}&type=channel&key=${YOUTUBE_API_KEY}`
      )
      const searchData = await searchRes.json()
      if (searchData.items?.length > 0) {
        searchId = searchData.items[0].id.channelId
      } else {
        return null
      }
    }

    const res = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${searchId}&key=${YOUTUBE_API_KEY}`
    )
    const data = await res.json()

    if (!data.items?.length) return null

    const channel = data.items[0]
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnailUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || '',
      subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics.videoCount || '0'),
      viewCount: parseInt(channel.statistics.viewCount || '0'),
      country: channel.snippet.country || '',
      customUrl: channel.snippet.customUrl || '',
    }
  } catch (error) {
    console.error('Failed to fetch YouTube channel:', error)
    return null
  }
}

/**
 * Fetch recent videos from a channel
 */
export async function fetchChannelVideos(channelId: string, maxResults = 10): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) return []

  try {
    // Get recent uploads playlist
    const channelRes = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    )
    const channelData = await channelRes.json()

    if (!channelData.items?.length) return []

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Get videos from uploads playlist
    const playlistRes = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    )
    const playlistData = await playlistRes.json()

    if (!playlistData.items?.length) return []

    // Get video details
    const videoIds = playlistData.items.map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId).join(',')
    const detailsRes = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    )
    const detailsData = await detailsRes.json()

    return (detailsData.items || []).map((video: Record<string, unknown>) => ({
      id: video.id as string,
      title: (video.snippet as Record<string, unknown>)?.title as string,
      description: (video.snippet as Record<string, unknown>)?.description as string,
      thumbnailUrl: ((video.snippet as Record<string, unknown>)?.thumbnails as Record<string, unknown>)?.high as string || '',
      publishedAt: (video.snippet as Record<string, unknown>)?.publishedAt as string,
      viewCount: parseInt(((video.statistics as Record<string, unknown>)?.viewCount as string) || '0'),
      likeCount: parseInt(((video.statistics as Record<string, unknown>)?.likeCount as string) || '0'),
      commentCount: parseInt(((video.statistics as Record<string, unknown>)?.commentCount as string) || '0'),
      duration: (video.contentDetails as Record<string, unknown>)?.duration as string,
    }))
  } catch (error) {
    console.error('Failed to fetch channel videos:', error)
    return []
  }
}

/**
 * Fetch video metrics (views, likes, comments)
 */
export async function fetchVideoMetrics(videoId: string): Promise<{ views: number; likes: number; comments: number } | null> {
  if (!YOUTUBE_API_KEY) return null

  try {
    const res = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    )
    const data = await res.json()

    if (!data.items?.length) return null

    const stats = data.items[0].statistics
    return {
      views: parseInt(stats.viewCount || '0'),
      likes: parseInt(stats.likeCount || '0'),
      comments: parseInt(stats.commentCount || '0'),
    }
  } catch (error) {
    console.error('Failed to fetch video metrics:', error)
    return null
  }
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

/**
 * Auto-detect platform from URL
 */
export function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('/shorts/')) return 'youtube_shorts'
    return 'youtube_long'
  }
  if (url.includes('instagram.com')) {
    if (url.includes('/reel/')) return 'instagram_reels'
    if (url.includes('/stories/')) return 'instagram_stories'
    if (url.includes('/p/')) return 'instagram_posts'
    return 'instagram_reels'
  }
  return 'unknown'
}
