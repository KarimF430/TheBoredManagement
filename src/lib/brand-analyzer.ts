import OpenAI from 'openai'
import { matchBrandsFromTranscript, type CandidateSpan } from './brand-matcher'
import { loadGazetteer, getBrandsForWhisper, type Gazetteer } from './brand-gazetteer'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
})

export type VideoFormat =
  | 'single_review'
  | 'comparison'
  | 'roundup'
  | 'haul_or_vlog'
  | 'tutorial_or_howto'
  | 'other'

export interface BrandNote {
  brand_name: string
  why_it_matters: string
  confidence: number
  context_quotes: string[]
}

export interface BrandAnalysisResult {
  video_format: VideoFormat
  brand_notes: BrandNote[]
}

export interface BrandDetection {
  brand_name: string
  confidence: number
  mention_type: 'primary_review' | 'comparison' | 'mentioned' | 'recommendation'
  context_quotes: string[]
  why_it_matters?: string
  match_type?: 'exact' | 'fuzzy'
}

const RETAIL_PLATFORMS = [
  'amazon', 'flipkart', 'meesho', 'myntra', 'ajio', 'snapdeal',
  'tata cliq', 'nykaa', 'reliance digital', 'croma', 'vijay sales',
  'industry buying', 'paytm mall', 'jiomart',
]

const RETAIL_SET = new Set(RETAIL_PLATFORMS)

let _gazetteer: Gazetteer | null = null

function getGazetteer(): Gazetteer {
  if (!_gazetteer) {
    _gazetteer = loadGazetteer()
  }
  return _gazetteer
}

function buildClassificationPrompt(
  candidates: CandidateSpan[],
  videoTitle: string,
  channelName: string,
  description: string,
  pinnedComment: string | null,
  campaignBrands: string[]
): string {
  const candidateList = candidates.map((c, i) => {
    const isCampaignBrand = campaignBrands.some(
      cb => cb.toLowerCase() === c.brand.canonical.toLowerCase()
    )
    return `[${i}] "${c.brand.canonical}" (category: ${c.brand.subCategory}) — matched via ${c.matchType} (score: ${(c.confidence * 100).toFixed(0)}%)${isCampaignBrand ? ' [CAMPAIGN BRAND]' : ''}\n    Context: "${c.contextWindow}"`
  }).join('\n')

  return `You are a brand mention classifier for YouTube video transcripts. Your ONLY job is to determine if each candidate brand is genuinely mentioned or is a false positive.

═══ VIDEO CONTEXT ═══
TITLE: "${videoTitle}"
CHANNEL: ${channelName}
DESCRIPTION: ${description?.slice(0, 500) || '(none)'}
PINNED COMMENT: ${pinnedComment || '(none)'}
CAMPAIGN BRANDS TO PRIORITIZE: ${campaignBrands.length > 0 ? campaignBrands.join(', ') : '(none specified)'}

═══ CLASSIFICATION RULES ═══
For each candidate, classify as:

- "genuine": Brand is actually discussed, reviewed, compared, or recommended
- "false_positive": Homonym (Apple the fruit), incidental mention, or not a real brand reference
- "sponsor": Paid promotion, sponsored segment, or brand-read script

Key rules:
- Retail platforms (Amazon, Flipkart, Meesho, Myntra, etc.) are ALWAYS false_positive
- Generic words ("a mixer grinder") are false_positive — only branded versions count
- Brief mentions without opinion ("I also tried a Kent one ages ago") are genuine but low confidence
- Regional language mentions carry identical weight to English
- Campaign brands should get higher confidence if genuinely present

═══ CANDIDATES ═══
${candidateList}

═══ OUTPUT FORMAT ═══
Return ONLY this JSON, no explanation:
{
  "classifications": [
    {
      "index": 0,
      "label": "genuine|false_positive|sponsor",
      "confidence": 0.0-1.0,
      "reason": "one line reason"
    }
  ]
}`
}

function buildFullExtractionPrompt(
  transcript: string,
  title: string,
  channelName: string,
  description: string,
  pinnedComment: string | null,
  campaignBrands: string[]
): string {
  return `You are TBM's senior market intelligence analyst. You've manually watched thousands of Indian YouTube videos and written brand notes for client pitch decks. Your notes go straight into client-facing reports, so precision matters more than coverage.

═══ INPUT ═══
TITLE: ${title}
CHANNEL: ${channelName}
DESCRIPTION: ${description || '(none provided)'}
PINNED COMMENT: ${pinnedComment || '(none available)'}
TRANSCRIPT: ${transcript}

CAMPAIGN BRANDS (prioritize detecting these if genuinely present): ${campaignBrands.length > 0 ? campaignBrands.join(', ') : '(none specified)'}

═══ RULES ═══
- Retail platforms (Amazon, Flipkart, Meesho, etc.) are NEVER brands
- Generic category words are not brands
- Regional-language mentions carry identical weight to English
- Only tag brands that earn a place — if you can't state why a real analyst would write it down, don't include it

═══ OUTPUT ═══
Return ONLY this JSON:
{
  "video_format": "single_review|comparison|roundup|haul_or_vlog|tutorial_or_howto|other",
  "brand_notes": [
    {
      "brand_name": string,
      "why_it_matters": string,
      "confidence": number,
      "context_quotes": string[]
    }
  ]
}`
}

function isRetailPlatform(brandName: string): boolean {
  const lower = brandName.toLowerCase().trim()
  return RETAIL_SET.has(lower) || RETAIL_PLATFORMS.some(p => lower.includes(p))
}

export async function analyzeBrandsFromTranscript(
  transcript: string,
  videoTitle: string,
  knownBrands: string[] = [],
  channelName: string = '',
  description: string = '',
  pinnedComment: string | null = null
): Promise<BrandDetection[]> {
  if (!transcript || transcript.length < 20) {
    return analyzeBrandsFromMetadata(videoTitle, channelName, description, knownBrands)
  }

  const truncatedTranscript = transcript.slice(0, 15000)
  const truncatedDesc = (description || '').slice(0, 3000)

  try {
    const gazetteer = getGazetteer()
    const matchResult = matchBrandsFromTranscript(
      truncatedTranscript,
      knownBrands,
      gazetteer
    )

    const filteredCandidates = matchResult.candidates.filter(c => {
      if (isRetailPlatform(c.brand.canonical)) return false
      if (c.brand.canonical.length < 2) return false
      return true
    })

    if (filteredCandidates.length === 0) {
      return []
    }

    const classifiedBrands = await classifyCandidates(
      filteredCandidates.slice(0, 25),
      videoTitle,
      channelName,
      truncatedDesc,
      pinnedComment,
      knownBrands
    )

    const detections: BrandDetection[] = classifiedBrands
      .filter(c => c.label !== 'false_positive')
      .map(c => {
        const candidate = filteredCandidates[c.index]
        let mentionType: BrandDetection['mention_type'] = 'mentioned'
        if (c.label === 'sponsor') mentionType = 'primary_review'
        else if (c.confidence >= 0.9) mentionType = 'primary_review'
        else if (c.confidence >= 0.7) mentionType = 'comparison'

        return {
          brand_name: candidate.brand.canonical,
          confidence: Math.max(0, Math.min(1, c.confidence)),
          mention_type: mentionType,
          context_quotes: [candidate.contextWindow.slice(0, 200)],
          why_it_matters: c.reason,
          match_type: candidate.matchType,
        }
      })
      .sort((a, b) => b.confidence - a.confidence)

    return detections
  } catch (err) {
    console.error('Brand matching failed, falling back to full extraction:', err)
    return fullExtractionFallback(
      truncatedTranscript,
      videoTitle,
      knownBrands,
      channelName,
      truncatedDesc,
      pinnedComment
    )
  }
}

async function classifyCandidates(
  candidates: CandidateSpan[],
  videoTitle: string,
  channelName: string,
  description: string,
  pinnedComment: string | null,
  campaignBrands: string[]
): Promise<Array<{ index: number; label: string; confidence: number; reason: string }>> {
  const prompt = buildClassificationPrompt(
    candidates,
    videoTitle,
    channelName,
    description,
    pinnedComment,
    campaignBrands
  )

  try {
    const completion = await openai.chat.completions.create({
      model: 'google/gemma-4-26b-a4b-it:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
    })

    const text = completion.choices[0]?.message?.content?.trim() || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return candidates.map((_, i) => ({
        index: i,
        label: 'genuine',
        confidence: 0.7,
        reason: 'Fallback: matched from brand gazetteer',
      }))
    }

    const result = JSON.parse(jsonMatch[0])
    return result.classifications || []
  } catch (err) {
    console.error('Classification failed:', err)
    return candidates.map((_, i) => ({
      index: i,
      label: 'genuine',
      confidence: 0.6,
      reason: 'Fallback: LLM classification unavailable',
    }))
  }
}

async function fullExtractionFallback(
  transcript: string,
  videoTitle: string,
  knownBrands: string[],
  channelName: string,
  description: string,
  pinnedComment: string | null
): Promise<BrandDetection[]> {
  const prompt = buildFullExtractionPrompt(
    transcript,
    videoTitle,
    channelName,
    description,
    pinnedComment,
    knownBrands
  )

  try {
    const completion = await openai.chat.completions.create({
      model: 'google/gemma-4-26b-a4b-it:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
    })

    const text = completion.choices[0]?.message?.content?.trim() || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const result: BrandAnalysisResult = JSON.parse(jsonMatch[0])

    const filteredNotes = (result.brand_notes || []).filter(note => {
      const nameLower = note.brand_name.toLowerCase().trim()
      if (RETAIL_SET.has(nameLower) || RETAIL_PLATFORMS.some(p => nameLower.includes(p))) {
        return false
      }
      if (nameLower.length < 2) return false
      return true
    })

    return filteredNotes
      .filter(note => note.brand_name && typeof note.confidence === 'number')
      .map(note => {
        let mentionType: BrandDetection['mention_type'] = 'mentioned'
        if (result.video_format === 'single_review') mentionType = 'primary_review'
        else if (result.video_format === 'comparison') mentionType = 'comparison'
        else if (note.why_it_matters?.toLowerCase().includes('recommend')) mentionType = 'recommendation'

        return {
          brand_name: note.brand_name,
          confidence: Math.max(0, Math.min(1, note.confidence)),
          mention_type: mentionType,
          context_quotes: (note.context_quotes || []).slice(0, 3),
          why_it_matters: note.why_it_matters,
          match_type: 'exact' as const,
        }
      })
      .sort((a, b) => b.confidence - a.confidence)
  } catch (err) {
    console.error('Full extraction fallback failed:', err)
    return []
  }
}

export async function analyzeVideoBatch(
  videos: { videoId: string; transcript: string; title: string; channelName?: string; description?: string }[],
  knownBrands: string[] = []
): Promise<Map<string, BrandDetection[]>> {
  const results = new Map<string, BrandDetection[]>()

  for (const video of videos) {
    const detections = await analyzeBrandsFromTranscript(
      video.transcript,
      video.title,
      knownBrands,
      video.channelName || '',
      video.description || ''
    )
    results.set(video.videoId, detections)

    await new Promise(r => setTimeout(r, 2000))
  }

  return results
}

export async function analyzeBrandsFromMetadata(
  title: string,
  channelName: string,
  description: string,
  knownBrands: string[] = []
): Promise<BrandDetection[]> {
  const metadataText = [title, channelName, description].filter(Boolean).join(' ').slice(0, 5000)
  if (!metadataText) return []

  const gazetteer = getGazetteer()
  const matchResult = matchBrandsFromTranscript(metadataText, knownBrands, gazetteer)

  const filteredCandidates = matchResult.candidates.filter(c => {
    if (isRetailPlatform(c.brand.canonical)) return false
    if (c.brand.canonical.length < 2) return false
    return true
  })

  if (filteredCandidates.length === 0) return []

  const classifiedBrands = await classifyCandidates(
    filteredCandidates.slice(0, 15),
    title,
    channelName,
    description,
    null,
    knownBrands
  )

  return classifiedBrands
    .filter(c => c.label !== 'false_positive')
    .map(c => {
      const candidate = filteredCandidates[c.index]
      let mentionType: BrandDetection['mention_type'] = 'mentioned'
      if (c.confidence >= 0.9) mentionType = 'primary_review'
      else if (c.confidence >= 0.7) mentionType = 'comparison'
      return {
        brand_name: candidate.brand.canonical,
        confidence: Math.max(0, Math.min(1, c.confidence)),
        mention_type: mentionType,
        context_quotes: [candidate.contextWindow.slice(0, 200)],
        match_type: candidate.matchType,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)
}

// ── Irrelevant Video Detection ────────────────────────────────────

export interface IrrelevantResult {
  is_irrelevant: boolean
  reason: string
  score: number // 0 = relevant, 1 = completely irrelevant
  category: string // 'shorts', 'music', 'gaming', 'non_review', 'foreign', 'other'
}

const IRRELEVANCE_CATEGORIES = [
  'shorts',          // YouTube Shorts (< 60s)
  'music',           // Music videos, songs, albums
  'gaming',          // Gaming content, Let's Play
  'non_review',      // News, opinion, drama, no product mention
  'foreign_language', // Non-Indian languages
  'live_stream',     // Live streams, podcasts
  'compilation',     // Compilations, memes, funny clips
  'other',           // Everything else
]

function buildIrrelevancePrompt(title: string, channelName: string, description: string): string {
  return `You are a video relevance classifier for Indian YouTube brand tracking. Determine if this video is relevant for brand mention analysis.

VIDEO CONTEXT:
TITLE: "${title}"
CHANNEL: "${channelName}"
DESCRIPTION: "${description?.slice(0, 500) || '(none)'}"

RULES:
- RELEVANT: Product reviews, comparisons, recommendations, tutorials, unboxings, hauls, how-to videos mentioning products
- IRRELEVANT: Music videos, gaming, live streams, shorts (<60s), compilations, memes, news/drama, non-Indian content, pure entertainment with no product discussion

Return ONLY this JSON:
{
  "is_irrelevant": true/false,
  "reason": "one line reason",
  "score": 0.0-1.0,
  "category": "shorts|music|gaming|non_review|foreign_language|live_stream|compilation|other"
}`
}

export async function detectIrrelevantVideo(
  title: string,
  channelName: string,
  description: string
): Promise<IrrelevantResult> {
  // Quick heuristic filters first (no LLM call needed)
  const titleLower = title.toLowerCase()

  // Heuristic: YouTube Shorts indicators
  if (titleLower.includes('#shorts') || titleLower.includes('#short')) {
    return { is_irrelevant: true, reason: 'YouTube Short detected', score: 1.0, category: 'shorts' }
  }

  // Heuristic: Music video indicators
  if (titleLower.includes('official music video') || titleLower.includes('song') ||
      titleLower.includes('album') || titleLower.includes('lyrics') ||
      titleLower.includes('audio') || titleLower.includes('remix')) {
    return { is_irrelevant: true, reason: 'Music content detected', score: 0.95, category: 'music' }
  }

  // Heuristic: Gaming indicators
  if (titleLower.includes('gameplay') || titleLower.includes('let\'s play') ||
      titleLower.includes('minecraft') || titleLower.includes('gta') ||
      titleLower.includes('free fire') || titleLower.includes('bgmi') ||
      titleLower.includes('pubg')) {
    return { is_irrelevant: true, reason: 'Gaming content detected', score: 0.9, category: 'gaming' }
  }

  // Heuristic: Live stream indicators
  if (titleLower.includes('live') || titleLower.includes('stream') ||
      titleLower.includes('podcast') || titleLower.includes('interview')) {
    return { is_irrelevant: true, reason: 'Live stream/podcast detected', score: 0.8, category: 'live_stream' }
  }

  // If heuristics don't catch it, use LLM
  try {
    const completion = await openai.chat.completions.create({
      model: 'google/gemma-4-26b-a4b-it:free',
      messages: [{ role: 'user', content: buildIrrelevancePrompt(title, channelName, description) }],
      temperature: 0.1,
      max_tokens: 300,
    })

    const text = completion.choices[0]?.message?.content?.trim() || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { is_irrelevant: false, reason: '', score: 0, category: 'other' }
    }

    const result = JSON.parse(jsonMatch[0])
    return {
      is_irrelevant: result.is_irrelevant || false,
      reason: result.reason || '',
      score: Math.max(0, Math.min(1, result.score || 0)),
      category: IRRELEVANCE_CATEGORIES.includes(result.category) ? result.category : 'other',
    }
  } catch (err) {
    console.error('Irrelevance detection failed, assuming relevant:', err)
    return { is_irrelevant: false, reason: '', score: 0, category: 'other' }
  }
}
