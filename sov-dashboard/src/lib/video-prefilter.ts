import { fetchTranscript } from './transcript'
import { detectIrrelevantVideo } from './brand-analyzer'

export interface PreFilterCandidate {
  youtube_id: string
  title: string
  channel_name: string
  channel_id: string
  description?: string
  duration_sec?: number
}

export interface PreFilterResult {
  isValid: boolean
  reason: string
  category: string
  transcript?: string
}

/**
 * 4-Layer AI Pre-Filter:
 * Validates whether a candidate YouTube video contains informative speech / review
 * content satisfying the keyword search intent before accepting it into keyword rankings.
 */
export async function validateVideoPreFilter(
  video: PreFilterCandidate,
  keywordText: string,
  options: { skipWhisper?: boolean } = { skipWhisper: true }
): Promise<PreFilterResult> {
  // Layer 1: Fast Heuristics (Instant Regex on title & description)
  const heuristicCheck = await detectIrrelevantVideo(
    video.title,
    video.channel_name,
    video.description || '',
    undefined,
    keywordText
  )

  if (heuristicCheck.is_irrelevant) {
    return {
      isValid: false,
      reason: heuristicCheck.reason || 'Irrelevant content detected by heuristics',
      category: heuristicCheck.category || 'other',
    }
  }

  // Layer 2: Fast Transcript Fetch (YouTube Subtitles / Captions)
  let transcriptData: { text: string; language: string } | null = null
  try {
    transcriptData = await fetchTranscript(video.youtube_id, { skipWhisper: options.skipWhisper })
  } catch (err) {
    console.warn(`Transcript fetch failed during pre-filter for video ${video.youtube_id}:`, err)
  }

  const transcript = transcriptData?.text?.trim() || ''

  // Layer 3: Transcript Speech & Density Check OR Metadata Evaluation
  if (transcript.length >= 30) {
    // Check speech density for long-form content (>60s)
    if (video.duration_sec && video.duration_sec > 60) {
      const wordCount = transcript.split(/\s+/).filter(Boolean).length
      const durationMinutes = video.duration_sec / 60
      const wordsPerMinute = wordCount / durationMinutes

      if (wordsPerMinute < 12) {
        return {
          isValid: false,
          reason: `Insufficient spoken word density (${Math.round(wordsPerMinute)} words/min — likely music/B-roll)`,
          category: 'low_speech_density',
          transcript,
        }
      }
    }

    // Layer 4: AI Relevance Classifier with Transcript Context
    const fullCheck = await detectIrrelevantVideo(
      video.title,
      video.channel_name,
      video.description || '',
      transcript,
      keywordText
    )

    if (fullCheck.is_irrelevant) {
      return {
        isValid: false,
        reason: fullCheck.reason || 'AI evaluation determined video does not satisfy search query intent',
        category: fullCheck.category || 'irrelevant_content',
        transcript,
      }
    }
  } else {
    // Captions unavailable — evaluate relevance using AI Metadata & Intent Classifier (title + channel + description)
    const metaCheck = await detectIrrelevantVideo(
      video.title,
      video.channel_name,
      video.description || '',
      undefined,
      keywordText
    )

    if (metaCheck.is_irrelevant) {
      return {
        isValid: false,
        reason: metaCheck.reason || 'AI metadata evaluation determined video does not satisfy search query intent',
        category: metaCheck.category || 'irrelevant_content',
      }
    }
  }

  return {
    isValid: true,
    reason: 'Valid spoken product review / informative video',
    category: 'valid',
    transcript: transcript || undefined,
  }
}
