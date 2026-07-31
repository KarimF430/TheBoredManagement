import AhoCorasick from 'ahocorasick'
import { loadGazetteer, type BrandEntry, type Gazetteer } from './brand-gazetteer'

export interface CandidateSpan {
  brand: BrandEntry
  matchType: 'exact' | 'fuzzy'
  confidence: number
  startOffset: number
  endOffset: number
  contextWindow: string
  matchedTerm: string
}

export interface MatchResult {
  candidates: CandidateSpan[]
  exactMatchCount: number
  fuzzyMatchCount: number
  processedText: string
}

const CONTEXT_WINDOW_SIZE = 150
const FUZZY_MAX_DISTANCE = 2
const MIN_FUZZY_WORD_LEN = 5

const STOPWORDS = new Set([
  'the', 'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they',
  'their', 'what', 'when', 'where', 'which', 'about', 'would', 'could',
  'should', 'there', 'these', 'those', 'some', 'than', 'them', 'then',
  'also', 'very', 'often', 'each', 'just', 'into', 'over', 'such',
  'more', 'most', 'only', 'other', 'into', 'like', 'well', 'back',
  'after', 'your', 'does', 'both', 'make', 'same', 'here', 'come',
  'said', 'each', 'find', 'hand', 'high', 'keep', 'last', 'long',
  'great', 'made', 'real', 'best', 'sure', 'free', 'full', 'ever',
  'used', 'doing', 'want', 'give', 'many', 'such', 'take', 'year',
  'them', 'some', 'time', 'very', 'when', 'come', 'could', 'make',
  'today', 'going', 'video', 'guys', 'welcome', 'review', 'look',
  'first', 'still', 'right', 'thing', 'stuff', 'actually', 'pretty',
  'really', 'nice', 'good', 'cheap', 'buy', 'bought', 'get', 'got',
  'let', 'show', 'tell', 'talk', 'start', 'check', 'try', 'new',
  'old', 'big', 'small', 'top', 'bottom', 'left', 'right',
])

let _aho: AhoCorasick | null = null
let _brandMap: Map<string, BrandEntry> = new Map()
let _fuzzyIndex: Map<string, Array<{ alias: string; brand: BrandEntry }>> | null = null
let _gazetteerRef: Gazetteer | null = null

function buildAhoCorasick(gazetteer: Gazetteer): AhoCorasick {
  if (_aho && _gazetteerRef === gazetteer) return _aho

  const patterns: string[] = []
  _brandMap = new Map()

  for (const brand of gazetteer.brands) {
    const lower = brand.canonical.toLowerCase()
    patterns.push(lower)
    _brandMap.set(lower, brand)

    for (const alias of brand.aliases) {
      if (alias !== lower) {
        patterns.push(alias)
        if (!_brandMap.has(alias)) {
          _brandMap.set(alias, brand)
        }
      }
    }
  }

  _aho = new AhoCorasick(patterns)
  _gazetteerRef = gazetteer

  return _aho
}

// Simple Levenshtein distance (early exit for performance)
function editDistance(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length
  if (Math.abs(aLen - bLen) > FUZZY_MAX_DISTANCE) return FUZZY_MAX_DISTANCE + 1

  const prev = new Int32Array(bLen + 1)
  const curr = new Int32Array(bLen + 1)

  for (let j = 0; j <= bLen; j++) prev[j] = j

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i
    let minVal = curr[0]
    for (let j = 1; j <= bLen; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1]
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
      }
      if (curr[j] < minVal) minVal = curr[j]
    }
    // Early abort: if entire row exceeds threshold, no point continuing
    if (minVal > FUZZY_MAX_DISTANCE && i < aLen) return FUZZY_MAX_DISTANCE + 1
    for (let j = 0; j <= bLen; j++) prev[j] = curr[j]
  }
  return prev[bLen]
}

// Build a prefix-indexed fuzzy lookup: group aliases by first 2 chars
function buildFuzzyIndex(gazetteer: Gazetteer): Map<string, Array<{ alias: string; brand: BrandEntry }>> {
  if (_fuzzyIndex && _gazetteerRef === gazetteer) return _fuzzyIndex

  _fuzzyIndex = new Map()

  for (const brand of gazetteer.brands) {
    const lower = brand.canonical.toLowerCase()
    const allAliases = [lower, ...brand.aliases.map(a => a.toLowerCase())]

    for (const alias of allAliases) {
      if (alias.length < MIN_FUZZY_WORD_LEN) continue
      const prefix = alias.slice(0, 2)
      if (!_fuzzyIndex.has(prefix)) {
        _fuzzyIndex.set(prefix, [])
      }
      _fuzzyIndex.get(prefix)!.push({ alias, brand })
    }
  }

  _gazetteerRef = gazetteer
  return _fuzzyIndex
}

function fuzzySearch(word: string, index: Map<string, Array<{ alias: string; brand: BrandEntry }>>): Array<{ brand: BrandEntry; distance: number }> {
  const prefix = word.slice(0, 2)
  const bucket = index.get(prefix)
  if (!bucket) return []

  const results: Array<{ brand: BrandEntry; distance: number }> = []

  for (const { alias, brand } of bucket) {
    // Length filter: skip if too different
    if (Math.abs(alias.length - word.length) > FUZZY_MAX_DISTANCE) continue

    const dist = editDistance(word, alias)
    if (dist <= FUZZY_MAX_DISTANCE) {
      results.push({ brand, distance: dist })
    }
  }

  // Sort by distance (best first)
  results.sort((a, b) => a.distance - b.distance)
  return results
}

function isWordBoundary(text: string, pos: number): boolean {
  if (pos <= 0 || pos >= text.length) return true
  const ch = text[pos]
  return ch === ' ' || ch === '\n' || ch === '\t' || ch === ',' || ch === '.' || ch === '!' || ch === '?' || ch === ';' || ch === ':' || ch === ')' || ch === ']' || ch === '"'
}

function isWordChar(ch: string): boolean {
  return ch !== ' ' && ch !== '\n' && ch !== '\t'
}

function extractContext(transcript: string, start: number, end: number, windowSize: number): string {
  const contextStart = Math.max(0, start - windowSize)
  const contextEnd = Math.min(transcript.length, end + windowSize)
  let context = transcript.slice(contextStart, contextEnd).trim()

  if (contextStart > 0) {
    const firstSpace = context.indexOf(' ')
    if (firstSpace > 0) context = '...' + context.slice(firstSpace)
  }
  if (contextEnd < transcript.length) {
    const lastSpace = context.lastIndexOf(' ')
    if (lastSpace > 0) context = context.slice(0, lastSpace) + '...'
  }

  return context
}

function findWordBoundaries(text: string, pos: number): { start: number; end: number } {
  let start = pos
  let end = pos

  while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\n' && text[start - 1] !== '\t') {
    start--
  }
  while (end < text.length && text[end] !== ' ' && text[end] !== '\n' && text[end] !== '\t') {
    end++
  }

  return { start, end }
}

export function matchBrands(
  transcript: string,
  gazetteer?: Gazetteer
): MatchResult {
  const gaz = gazetteer || loadGazetteer()
  const aho = buildAhoCorasick(gaz)
  const fuzzyIdx = buildFuzzyIndex(gaz)

  const transcriptLower = transcript.toLowerCase()

  const exactResults = aho.search(transcriptLower)

  const candidateMap = new Map<string, CandidateSpan>()
  const matchedPositions = new Set<number>()

  for (const [endPos, brands] of exactResults) {
    for (const brandOrAlias of brands) {
      const brand = _brandMap.get(brandOrAlias)
      if (!brand) continue

      const startPos = endPos - brandOrAlias.length + 1

      // Word boundary check: skip if match is a substring inside a longer word
      const charBefore = startPos > 0 ? transcriptLower[startPos - 1] : ' '
      const charAfter = (endPos + 1) < transcriptLower.length ? transcriptLower[endPos + 1] : ' '
      if (isWordChar(charBefore) || isWordChar(charAfter)) continue

      const { start: wordStart, end: wordEnd } = findWordBoundaries(transcript, startPos)

      for (let i = wordStart; i < wordEnd; i++) {
        matchedPositions.add(i)
      }

      const key = `${brand.canonical}|${wordStart}`
      if (!candidateMap.has(key)) {
        const context = extractContext(transcript, wordStart, wordEnd, CONTEXT_WINDOW_SIZE)
        candidateMap.set(key, {
          brand,
          matchType: 'exact',
          confidence: 1.0,
          startOffset: wordStart,
          endOffset: wordEnd,
          contextWindow: context,
          matchedTerm: transcript.slice(wordStart, wordEnd),
        })
      }
    }
  }

  let fuzzyCount = 0

  const words = transcriptLower.split(/\s+/)
  const originalWords = transcript.split(/\s+/)

  // Fuzzy match: check individual words only (not n-grams)
  // This is O(words) Fuse searches instead of O(words^4)
  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i]
    // Strip leading/trailing punctuation
    const word = rawWord.replace(/^[.,!?;:'"()\[\]]+|[.,!?;:'"()\[\]]+$/g, '')

    // Skip short words, stopwords, and already-matched words
    if (word.length < MIN_FUZZY_WORD_LEN) continue
    if (STOPWORDS.has(word)) continue

    const wordStart = originalWords.slice(0, i).join(' ').length + (i > 0 ? 1 : 0)
    const wordEnd = wordStart + originalWords[i].length

    let alreadyMatched = false
    for (let j = wordStart; j < wordEnd; j++) {
      if (matchedPositions.has(j)) {
        alreadyMatched = true
        break
      }
    }
    if (alreadyMatched) continue

    // Also skip if the stripped word already has an exact match anywhere
    if (_brandMap.has(word)) continue

    const fuseResults = fuzzySearch(word, fuzzyIdx)

    for (const result of fuseResults) {
      const brand = result.brand
      const confidence = 1 - (result.distance / word.length)

      if (confidence < 0.75) continue

      const key = `${brand.canonical}|${wordStart}`
      if (!candidateMap.has(key)) {
        const context = extractContext(transcript, wordStart, wordEnd, CONTEXT_WINDOW_SIZE)
        candidateMap.set(key, {
          brand,
          matchType: 'fuzzy',
          confidence,
          startOffset: wordStart,
          endOffset: wordEnd,
          contextWindow: context,
          matchedTerm: originalWords[i],
        })
        fuzzyCount++
      }
    }
  }

  const candidates = Array.from(candidateMap.values())
    .sort((a, b) => b.confidence - a.confidence)

  return {
    candidates,
    exactMatchCount: candidateMap.size - fuzzyCount,
    fuzzyMatchCount: fuzzyCount,
    processedText: transcript,
  }
}

export function matchBrandsFromTranscript(
  transcript: string,
  knownBrands: string[] = [],
  gazetteer?: Gazetteer
): MatchResult {
  const result = matchBrands(transcript, gazetteer)

  if (knownBrands.length > 0) {
    const knownSet = new Set(knownBrands.map(b => b.toLowerCase()))

    for (const candidate of result.candidates) {
      if (knownSet.has(candidate.brand.canonical.toLowerCase())) {
        candidate.confidence = Math.min(1.0, candidate.confidence + 0.1)
      }
    }

    result.candidates.sort((a, b) => b.confidence - a.confidence)
  }

  return result
}

export function resetMatcher(): void {
  _aho = null
  _brandMap = new Map()
  _fuzzyIndex = null
  _gazetteerRef = null
}
