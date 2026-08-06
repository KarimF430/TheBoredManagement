import OpenAI from 'openai'

import { loadGazetteer, getBrandsForWhisper, type Gazetteer } from './brand-gazetteer'
import { matchBrandsFromTranscript, type CandidateSpan } from './brand-matcher'

// Built on first use, not at import time. The OpenAI constructor throws when no
// key is configured, and this module sits in the import chain of the whole scrape
// pipeline — an eager client would take down keyword scraping and the weekly
// refresh in any environment without an LLM key, even though neither needs one.
let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (process.env.OPENAI_API_KEY) {
      // Use direct OpenAI API if key is provided
      _openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } else {
      // Fallback to OpenRouter
      _openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY || '',
      })
    }
  }
  return _openai
}

/** True when brand analysis can run — callers use it to skip LLM work cleanly. */
export function isBrandAnalysisConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY)
}

function getModelName() {
  return process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'openai/gpt-4o-mini'
}

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

function buildFullExtractionPrompt(
  transcript: string,
  title: string,
  channelName: string,
  description: string,
  pinnedComment: string | null,
  campaignBrands: string[],
  candidateBrands: string[] = []
): string {
  return `You are TBM's senior market intelligence analyst. You've manually watched thousands of Indian YouTube videos and written brand notes for client pitch decks. Your notes go straight into client-facing reports, so precision matters more than coverage.

═══ INPUT ═══
TITLE: ${title}
CHANNEL: ${channelName}
DESCRIPTION: ${description || '(none provided)'}
PINNED COMMENT: ${pinnedComment || '(none available)'}
TRANSCRIPT: ${transcript}

BRANDS THIS CLIENT CARES ABOUT (prioritize detecting these if genuinely present — do not force-fit them if absent): ${campaignBrands.length > 0 ? campaignBrands.join(', ') : '(none specified)'}

CANDIDATE BRANDS FOUND BY TEXT SEARCH (a fast scan matched these names verbatim somewhere in the source — verify each one is a genuine, discussed brand mention before including it, and use this list to catch correct spellings of brands you might otherwise miss; do not include a name just because it's here): ${candidateBrands.length > 0 ? candidateBrands.join(', ') : '(none found)'}

═══ RULES ═══
- Retail platforms (Amazon, Flipkart, Meesho, etc.) are NEVER brands
- Generic category words are not brands
- Regional-language mentions carry identical weight to English
- IGNORE peripheral/contextual brands (e.g., Apple, Google, Android, iOS, Windows) if they are only mentioned for connectivity, OS support, or casting.
- IGNORE streaming platforms (e.g., Netflix, YouTube, Hotstar, Prime Video) unless the video is exclusively reviewing them.
- IGNORE brands of connected devices (e.g., Sony speakers, Samsung phones) unless they are the central product being reviewed.
- Only tag brands that earn a place — if you can't state why a real analyst would write it down as the CORE PRODUCT of the video, don't include it.

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

/**
 * Brand names that are also ordinary words. The Amazon India master contains real
 * brands called "AND" (Anita Dongre), "Max", "W", "Uno", "Vim", "Rin", "Lee"…
 * Matched loosely, "and" alone tags every transcript in the database. These names
 * are only accepted when they appear with their exact brand casing in the source.
 */
const AMBIGUOUS_BRAND_NAMES = new Set([
  'and', 'max', 'w', 'uno', 'one', 'eno', 'vim', 'rin', 'bru', 'lee', 'vip',
  'mac', 'pac', 'ea', 'dk', 'sg', 'bas', 'go', 'now', 'new', 'best', 'top',
  'pro', 'plus', 'air', 'life', 'home', 'play', 'star', 'king', 'boss', 'nothing',
])

function normalizeForMatch(text: string): string {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Below this much source material there is nothing meaningful to ground against
 * (a title-only or stub input), so the grounding check is skipped rather than
 * rejecting everything the model reports.
 */
const MIN_GROUNDABLE_SOURCE_CHARS = 200

/**
 * Did this brand actually appear in the material we analysed?
 *
 * The model occasionally invents a plausible competitor. A brand that appears
 * nowhere in the transcript, title, description or channel name is treated as a
 * hallucination and dropped.
 *
 * Product lines count as the brand: a review that only ever says "iPhone 15"
 * still grounds "Apple", via the master list's aliases. Campaign brands and very
 * short sources bypass the check (see the caller).
 */
function isGroundedInSource(brandName: string, sourceText: string): boolean {
  const haystack = normalizeForMatch(sourceText)
  const brand = normalizeForMatch(brandName)
  if (!brand) return false
  if (haystack.includes(brand)) return true

  // Fall back to the brand's known aliases (iphone → Apple, redmi → Xiaomi…).
  try {
    const gazetteer = getGazetteer()
    const entry =
      gazetteer.byCanonical.get(brandName.toLowerCase().trim()) ??
      gazetteer.byAlias.get(brandName.toLowerCase().trim())
    if (entry) {
      for (const alias of entry.aliases) {
        const normalized = normalizeForMatch(alias)
        if (normalized.length >= 3 && haystack.includes(normalized)) return true
      }
    }
  } catch {
    // No gazetteer — the direct check above is all we have.
  }

  return false
}

/** Ambiguous names need their exact brand casing to count as a real mention. */
function passesAmbiguityGuard(brandName: string, rawSourceText: string): boolean {
  const lower = brandName.toLowerCase().trim()
  if (!AMBIGUOUS_BRAND_NAMES.has(lower) && brandName.trim().length > 3) return true

  // Require the brand's own casing, as a standalone word, somewhere in the source.
  const escaped = brandName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`).test(rawSourceText)
}

/**
 * Map a model-supplied name onto the master list's spelling ("boat" → "boAt",
 * "kent ro" → "KENT") so the same brand never splits into several rows.
 * Falls back to the model's own spelling when the gazetteer is unavailable.
 */
function canonicalizeBrandName(brandName: string): string {
  try {
    const gazetteer = getGazetteer()
    const key = brandName.toLowerCase().trim()
    const direct = gazetteer.byCanonical.get(key)
    if (direct) return direct.canonical
    const viaAlias = gazetteer.byAlias.get(key)
    if (viaAlias) return viaAlias.canonical
  } catch {
    // Gazetteer missing — the model's spelling is the best we have.
  }
  return brandName.trim()
}

interface RefineContext {
  sourceText: string
  campaignBrands: string[]
  videoFormat?: VideoFormat
}

/**
 * Turn raw model output into trustworthy detections:
 * retail platforms out, hallucinations out, ambiguous words out, names
 * canonicalised, duplicates merged, confidence clamped, quotes capped.
 */
function refineDetections(notes: BrandNote[], ctx: RefineContext): BrandDetection[] {
  const campaignSet = new Set(ctx.campaignBrands.map(b => b.toLowerCase().trim()))
  const merged = new Map<string, BrandDetection>()

  // The grounding and ambiguity guards both need real material to judge against.
  // With only a title or a stub to go on, rejecting on "not found in source"
  // would throw away every legitimate detection, so the guards stand down.
  const canVerify = ctx.sourceText.length >= MIN_GROUNDABLE_SOURCE_CHARS

  for (const note of notes) {
    if (!note?.brand_name || typeof note.confidence !== 'number') continue

    const raw = String(note.brand_name).trim()
    if (raw.length < 2) continue
    if (isRetailPlatform(raw)) continue

    const isCampaignBrand = campaignSet.has(raw.toLowerCase())

    if (!isCampaignBrand && canVerify) {
      if (!passesAmbiguityGuard(raw, ctx.sourceText)) continue
      if (!isGroundedInSource(raw, ctx.sourceText)) continue
    }

    const canonical = canonicalizeBrandName(raw)
    if (isRetailPlatform(canonical)) continue

    let mentionType: BrandDetection['mention_type'] = 'mentioned'
    if (ctx.videoFormat === 'single_review') mentionType = 'primary_review'
    else if (ctx.videoFormat === 'comparison') mentionType = 'comparison'
    if (note.why_it_matters?.toLowerCase().includes('recommend')) mentionType = 'recommendation'

    const detection: BrandDetection = {
      brand_name: canonical,
      confidence: Math.max(0, Math.min(1, note.confidence)),
      mention_type: mentionType,
      context_quotes: (note.context_quotes || []).slice(0, 3),
      why_it_matters: note.why_it_matters,
      match_type: 'exact',
    }

    const key = canonical.toLowerCase()
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, detection)
    } else if (detection.confidence > existing.confidence) {
      merged.set(key, {
        ...detection,
        context_quotes: [...new Set([...detection.context_quotes, ...existing.context_quotes])].slice(0, 3),
      })
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.confidence - a.confidence)
}

/**
 * Recall safety net for the brands the client actually pays to track.
 *
 * The model is the primary detector, but a campaign brand that is literally
 * present in the transcript must never be missed. The gazetteer matcher is used
 * only for this — never as the gate on which brands are allowed to exist, because
 * the Amazon master does not cover every category (it has no Aquaguard, Livpure
 * or AO Smith, for instance).
 */
function recoverMissedCampaignBrands(
  detections: BrandDetection[],
  campaignBrands: string[],
  sourceText: string
): BrandDetection[] {
  if (campaignBrands.length === 0) return detections

  const found = new Set(detections.map(d => d.brand_name.toLowerCase()))
  const recovered: BrandDetection[] = []

  for (const brand of campaignBrands) {
    const name = brand.trim()
    if (!name || found.has(name.toLowerCase())) continue
    if (isRetailPlatform(name)) continue
    if (!passesAmbiguityGuard(name, sourceText)) continue
    if (!isGroundedInSource(name, sourceText)) continue

    recovered.push({
      brand_name: canonicalizeBrandName(name),
      confidence: 0.55,
      mention_type: 'mentioned',
      context_quotes: [],
      why_it_matters: 'Campaign brand present in the video but not surfaced by the model',
      match_type: 'fuzzy',
    })
  }

  return [...detections, ...recovered].sort((a, b) => b.confidence - a.confidence)
}

/**
 * Second recall safety net, this time from the deterministic gazetteer
 * matcher rather than the campaign's own brand list. An exact Aho-Corasick
 * hit is by construction a literal, word-bounded match — the model
 * occasionally drops a brand it has no obvious reason to omit (a background
 * mention, a spelling it didn't recognise as the same brand). This only adds
 * brands the fast matcher found with an *exact* match; fuzzy candidates are
 * left to the model's own judgement since a low-confidence edit-distance
 * match is exactly the kind of thing worth a second opinion, not an
 * auto-include.
 */
function recoverMissedGazetteerBrands(
  detections: BrandDetection[],
  fastCandidates: CandidateSpan[],
  sourceText: string
): BrandDetection[] {
  if (fastCandidates.length === 0) return detections

  const found = new Set(detections.map(d => d.brand_name.toLowerCase()))
  const recovered: BrandDetection[] = []
  const addedThisPass = new Set<string>()

  for (const candidate of fastCandidates) {
    if (candidate.matchType !== 'exact') continue

    const canonical = candidate.brand.canonical
    const key = canonical.toLowerCase()
    if (found.has(key) || addedThisPass.has(key)) continue
    if (isRetailPlatform(canonical)) continue
    if (!passesAmbiguityGuard(canonical, sourceText)) continue

    addedThisPass.add(key)
    recovered.push({
      brand_name: canonical,
      confidence: 0.5,
      mention_type: 'mentioned',
      context_quotes: [candidate.contextWindow].filter(Boolean),
      why_it_matters: 'Exact brand-name match found by text search but not surfaced by the model',
      match_type: 'exact',
    })
  }

  return [...detections, ...recovered].sort((a, b) => b.confidence - a.confidence)
}

/** Parse the model's JSON, tolerating code fences and leading prose. */
function parseAnalysisJson(text: string): BrandAnalysisResult | null {
  if (!text) return null
  const withoutFences = text.replace(/```(?:json)?/gi, '')
  const match = withoutFences.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    if (!parsed || typeof parsed !== 'object') return null
    return {
      video_format: parsed.video_format ?? 'other',
      brand_notes: Array.isArray(parsed.brand_notes) ? parsed.brand_notes : [],
    }
  } catch {
    return null
  }
}

async function extractBrandNotes(
  transcript: string,
  videoTitle: string,
  channelName: string,
  description: string,
  pinnedComment: string | null,
  campaignBrands: string[],
  candidateBrands: string[] = []
): Promise<BrandAnalysisResult | null> {
  const prompt = buildFullExtractionPrompt(
    transcript,
    videoTitle,
    channelName,
    description,
    pinnedComment,
    campaignBrands,
    candidateBrands
  )

  const completion = await getOpenAI().chat.completions.create({
    model: getModelName(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2000,
  })

  return parseAnalysisJson(completion.choices[0]?.message?.content?.trim() || '')
}

/**
 * Detect the brands discussed in a video.
 *
 * The model reads the transcript with full context (title, channel, description,
 * pinned comment) and reports the brands worth recording. Its output is then
 * grounded against the source text, canonicalised against the Amazon India brand
 * master, and de-duplicated. Campaign brands get a recall pass so a client's own
 * brand is never silently dropped.
 */
export async function analyzeBrandsFromTranscript(
  transcript: string,
  videoTitle: string,
  knownBrands: string[] = [],
  channelName: string = '',
  description: string = '',
  pinnedComment: string | null = null
): Promise<BrandDetection[]> {
  // Too short to be a real transcript — analyse the metadata instead, but carry
  // the fragment and the pinned comment through so nothing is thrown away.
  if (!transcript || transcript.length < 20) {
    return analyzeBrandsFromMetadata(
      videoTitle,
      channelName,
      [description, transcript, pinnedComment].filter(Boolean).join(' '),
      knownBrands,
      pinnedComment
    )
  }

  const truncatedTranscript = transcript.slice(0, 15000)
  const truncatedDesc = (description || '').slice(0, 3000)
  const sourceText = [truncatedTranscript, videoTitle, channelName, truncatedDesc, pinnedComment ?? '']
    .filter(Boolean)
    .join('\n')

  // Fast, free, deterministic pre-pass (Aho-Corasick + fuzzy) against the
  // full brand gazetteer. Its exact matches feed the prompt as a hint — grounds
  // the model against real substring hits and catches spelling variants it
  // might not recognise as the same brand — and back a recall safety net
  // below, mirroring recoverMissedCampaignBrands but for any gazetteer brand,
  // not just this campaign's. It never gates or skips the LLM call: the
  // gazetteer doesn't cover every category, so it can only add, never remove.
  const fastMatch = matchBrandsFromTranscript(truncatedTranscript, knownBrands)
  const candidateBrands = [...new Set(
    fastMatch.candidates
      .filter(c => c.matchType === 'exact')
      .map(c => c.brand.canonical)
  )]

  let extraction: BrandAnalysisResult | null = null
  try {
    extraction = await extractBrandNotes(
      truncatedTranscript, videoTitle, channelName, truncatedDesc, pinnedComment, knownBrands, candidateBrands
    )
  } catch (err) {
    console.error(`Brand extraction failed for "${videoTitle}":`, err)
    return []
  }

  if (!extraction) {
    console.warn(`Brand extraction returned unparseable output for "${videoTitle}"`)
    return []
  }

  const detections = refineDetections(extraction.brand_notes, {
    sourceText,
    campaignBrands: knownBrands,
    videoFormat: extraction.video_format,
  })

  const withCampaignRecall = recoverMissedCampaignBrands(detections, knownBrands, sourceText)
  return recoverMissedGazetteerBrands(withCampaignRecall, fastMatch.candidates, sourceText)
}

export async function analyzeVideoBatch(
  videos: Array<{
    videoId: string
    title: string
    transcript: string
    channelName?: string
    description?: string
    pinnedComment?: string | null
  }>,
  knownBrands: string[] = [],
  delayMs: number = 2000
): Promise<Map<string, BrandDetection[]>> {
  const results = new Map<string, BrandDetection[]>()

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i]
    try {
      const detections = await analyzeBrandsFromTranscript(
        video.transcript,
        video.title,
        knownBrands,
        video.channelName || '',
        video.description || '',
        video.pinnedComment ?? null
      )
      results.set(video.videoId, detections)
    } catch (err) {
      // One bad video must not abandon the rest of the batch.
      console.error(`Batch analysis failed for video ${video.videoId}:`, err)
      results.set(video.videoId, [])
    }

    // Rate-limit between videos only — no point waiting after the last one.
    if (i < videos.length - 1) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  return results
}

/**
 * Brand detection for videos without a transcript — title, channel and
 * description only. Same grounding and canonicalisation rules apply.
 */
export async function analyzeBrandsFromMetadata(
  title: string,
  channelName: string,
  description: string,
  knownBrands: string[] = [],
  pinnedComment: string | null = null
): Promise<BrandDetection[]> {
  const metadataText = [title, channelName, description].filter(Boolean).join(' ').slice(0, 5000)
  if (!metadataText) return []

  let extraction: BrandAnalysisResult | null = null
  try {
    extraction = await extractBrandNotes(
      metadataText, title, channelName, description || '', pinnedComment, knownBrands
    )
  } catch (err) {
    console.error(`Metadata brand extraction failed for "${title}":`, err)
    return []
  }

  if (!extraction) return []

  const detections = refineDetections(extraction.brand_notes, {
    sourceText: metadataText,
    campaignBrands: knownBrands,
    videoFormat: extraction.video_format,
  })

  return recoverMissedCampaignBrands(detections, knownBrands, metadataText)
}

export interface IrrelevantResult {
  is_irrelevant: boolean
  reason: string
  score: number // 0 = relevant, 1 = completely irrelevant
  category: string // 'shorts', 'music', 'gaming', 'non_review', 'foreign', 'other'
}

const IRRELEVANCE_CATEGORIES = [
  'shorts',           // YouTube Shorts (< 60s)
  'music',            // Music videos, songs, albums
  'gaming',           // Gaming content, Let's Play
  'non_review',       // News, opinion, drama, no product mention
  'foreign_language', // Non-Indian languages
  'live_stream',      // Live streams, podcasts
  'compilation',      // Compilations, memes, funny clips
  'other',            // Everything else
]

function buildIrrelevancePrompt(
  title: string,
  channelName: string,
  description: string,
  transcript?: string,
  keywordText?: string
): string {
  const kwSection = keywordText ? `SEARCH KEYWORD INTENT: "${keywordText}"\n` : ''
  const trSection = transcript ? `TRANSCRIPT SNIPPET: "${transcript.slice(0, 1500)}"\n` : ''
  return `You are a video relevance classifier for Indian YouTube product search tracking. Determine if this video is relevant and contains meaningful product review speech.

VIDEO CONTEXT:
TITLE: "${title}"
CHANNEL: "${channelName}"
${kwSection}DESCRIPTION: "${description?.slice(0, 500) || '(none)'}"
${trSection}
RULES:
- RELEVANT: Product reviews, unboxings, comparisons, recommendations, buying guides, how-to/tutorials explaining products, human talking about product features/pros/cons.
- IRRELEVANT: Pure music videos, B-roll with background song, non-talking visual montages, gaming, live streams, compilations, memes, news/drama with no product review.

Return ONLY this JSON:
{
  "is_irrelevant": true/false,
  "reason": "one line clear reason why relevant or irrelevant",
  "score": 0.0-1.0,
  "category": "shorts|music|gaming|non_review|foreign_language|live_stream|compilation|other"
}`
}

export async function detectIrrelevantVideo(
  title: string,
  channelName: string,
  description: string,
  transcript?: string,
  keywordText?: string
): Promise<IrrelevantResult> {
  // Quick heuristic filters first (no LLM call needed)
  const titleLower = title.toLowerCase()

  // Heuristic: YouTube Shorts indicators
  if (titleLower.includes('#shorts') || titleLower.includes('#short')) {
    return { is_irrelevant: true, reason: 'YouTube Short detected', score: 1.0, category: 'shorts' }
  }

  // Heuristic: Music video indicators
  if (titleLower.includes('official music video') || titleLower.includes('official song') ||
    titleLower.includes('full album') || titleLower.includes('lyrics video') ||
    titleLower.includes('lirycs') || titleLower.includes('remix song')) {
    return { is_irrelevant: true, reason: 'Music video content detected', score: 0.95, category: 'music' }
  }

  // Heuristic: Gaming indicators
  if (titleLower.includes('gameplay') || titleLower.includes('let\'s play') ||
    titleLower.includes('minecraft') || titleLower.includes('gta 5') ||
    titleLower.includes('free fire') || titleLower.includes('bgmi') ||
    titleLower.includes('pubg')) {
    return { is_irrelevant: true, reason: 'Gaming content detected', score: 0.9, category: 'gaming' }
  }

  // Heuristic: Live stream indicators
  if (titleLower.includes('live stream') || titleLower.includes('podcast episode') ||
    titleLower.includes('interview with')) {
    return { is_irrelevant: true, reason: 'Live stream or podcast detected', score: 0.85, category: 'live_stream' }
  }

  // Heuristic: Known massive foreign tech channels
  const channelLower = channelName.toLowerCase()
  if (
    channelLower.includes('unbox therapy') || channelLower.includes('marques brownlee') || 
    channelLower.includes('mkbhd') || channelLower.includes('mrwhosetheboss') || 
    channelLower.includes('linus tech tips') || channelLower.includes('ijustine') || 
    channelLower.includes('dave2d') || channelLower.includes('uravgconsumer') ||
    channelLower.includes('austin evans') || channelLower.includes('techspurt') ||
    channelLower.includes('the verge') || channelLower.includes('cnet')
  ) {
    return { is_irrelevant: true, reason: 'Known foreign channel', score: 1.0, category: 'foreign_language' }
  }

  // Fallback to LLM for nuanced detection
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: getModelName(),
      messages: [{ role: 'user', content: buildIrrelevancePrompt(title, channelName, description, transcript, keywordText) }],
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
