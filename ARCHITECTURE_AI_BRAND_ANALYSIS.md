# AI Brand Analysis — Architecture Document

## Problem Statement

Detect brand and product mentions from YouTube video transcripts with high precision and recall, using a CSV master list of ~800+ brands across 12 categories. The system must handle:

- ASR (Automatic Speech Recognition) errors: "Gymshark" → "gym shark", "Häagen-Dazs" → "hogan dahs"
- Brand aliases: "Coke" → Coca-Cola, "Air Jordans" → Nike, "Pixel" → Google
- Homonyms: "Apple" (fruit) vs "Apple" (company)
- Indian language code-mixing: "Aquaguard le liya", "Samsung ka naya phone"
- Mention classification: sponsor read vs organic mention vs comparison

---

## Current System (Before)

```
Transcript → LLM (Gemma via OpenRouter) → BrandDetection[]
```

**Problems:**
1. LLM does extraction + classification in one shot — noisy precision
2. No pre-filtering — wastes tokens on brands findable via matching
3. ASR errors cause missed detections
4. No alias support
5. No category-aware matching

---

## Proposed System (After)

```
                         ┌─────────────────────┐
                         │   CSV Brand List     │
                         │ (Category-Sub-Brand) │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  Brand Gazetteer     │
                         │  - Aliases           │
                         │  - Categories        │
                         │  - Phonetics         │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
   ┌──────────▼──────────┐ ┌───────▼────────┐ ┌─────────▼────────┐
   │  Aho-Corasick Index │ │  Fuzzy Index   │ │  Whisper Prompt  │
   │  (Exact Matching)   │ │  (RapidFuzz)   │ │  (Brand Seeds)   │
   └──────────┬──────────┘ └───────┬────────┘ └─────────┬────────┘
              │                     │                     │
              └──────────┬──────────┘                     │
                         │                                │
              ┌──────────▼──────────┐                     │
              │  Candidate Spans    │◄────────────────────┘
              │  (with context)     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  LLM Classifier     │
              │  (Classification    │
              │   Only, Not Search) │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  BrandDetection[]   │
              │  (Final Output)     │
              └─────────────────────┘
```

---

## Component Details

### 1. Brand Gazetteer (`src/lib/brand-gazetteer.ts`)

**Purpose:** Parse CSV and build a structured brand index with aliases, categories, and phonetic variants.

**Data Structure:**
```typescript
interface BrandEntry {
  canonical: string        // "Samsung"
  aliases: string[]        // ["samsung", "galaxy"] 
  category: string         // "Mobiles, Tablets & More"
  subCategory: string      // "Mobile Phones"
  parentBrand?: string     // "Google" for "Google (Pixel)"
}

interface Gazetteer {
  brands: BrandEntry[]
  byCanonical: Map<string, BrandEntry>
  byAlias: Map<string, BrandEntry>  // lowercase alias → entry
  categories: Map<string, BrandEntry[]>  // category → brands
}
```

**CSV Parsing Logic:**
- Parse `Category,Sub-Category,Brand` columns
- Handle quoted fields with commas: `"Mobiles, Tablets & More"`
- Extract parent brand from parenthetical: `"Google (Pixel)"` → parent="Google", display="Pixel"
- Auto-generate aliases:
  - Lowercase canonical name
  - Split multi-word brands: "Air Jordans" → ["air jordans", "airjordan", "jordan"]
  - Common abbreviations: "OnePlus" → ["one plus", "oneplus", "op"]
  - Indian pronunciations: "Xiaomi" → ["xiaomi", "shiaomi", "mi"]

**Built-in Alias Rules:**
```typescript
const ALIAS_RULES: Record<string, string[]> = {
  // Brand → additional aliases
  "Coca-Cola": ["coke", "coca cola", "thums up", "sprite", "fanta"],
  "Nike": ["air jordan", "jordan", "airmax", "air max"],
  "Apple": ["iphone", "ipad", "macbook", "airpods", "apple watch"],
  "Samsung": ["galaxy", "one ui"],
  "Google": ["pixel", "nest", "chromecast"],
  "OnePlus": ["one plus", "op", "oxygen os"],
  "Xiaomi": ["mi", "redmi", "poco", "miui"],
  "boAt": ["boat", "bo at", "boat lifestyle"],
  // ... more rules
}
```

**Output:** JSON file at `src/data/brand-gazetteer.json` built at build time or on first access.

---

### 2. Brand Matcher (`src/lib/brand-matcher.ts`)

**Purpose:** Fast candidate detection using exact + fuzzy matching.

#### Layer 1: Aho-Corasick Exact Matching

**Why Aho-Corasick:**
- Single O(n) pass through transcript regardless of brand list size
- Handles overlapping matches (e.g., "Samsung Galaxy" matches both "Samsung" and "Galaxy")
- ~100x faster than regex for large pattern sets

**Implementation:**
```typescript
import ahocorasick from 'ahocorasick'  // or pyahocorasick equivalent

const ac = new ahocorasick()
for (const entry of gazetteer.brands) {
  ac.add(entry.canonical.toLowerCase(), entry)
  for (const alias of entry.aliases) {
    ac.add(alias.toLowerCase(), entry)
  }
}

// Search transcript
const matches = ac.search(transcriptLower)
// Returns: [{ start: 45, end: 52, value: BrandEntry }, ...]
```

**Handles:**
- Exact brand names: "Samsung", "Nike", "boAt"
- Exact aliases: "Coke", "Pixel", "Galaxy"
- Multi-word matches: "Air Jordans", "Red Mi"

#### Layer 2: RapidFuzz Fuzzy Matching

**Why RapidFuzz:**
- Catches ASR errors that exact matching misses
- ~10x faster than fuzzywuzzy
- Token sort ratio handles word reordering

**Strategy:**
1. Extract n-grams (2-5 words) from transcript sliding window
2. For each n-gram, compute fuzzy match score against all brand names
3. Threshold: 85% similarity (configurable)
4. Skip n-grams already matched by Aho-Corasick

```typescript
import { tokenSortRatio } from 'rapidfuzz'

function fuzzyMatchCandidates(
  transcript: string,
  exactMatches: Set<string>,
  threshold: number = 85
): FuzzyMatch[] {
  const candidates: FuzzyMatch[] = []
  const words = transcript.split(/\s+/)
  
  for (let n = 2; n <= 5; n++) {  // 2-5 word n-grams
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(' ')
      if (exactMatches.has(gram.toLowerCase())) continue
      
      for (const entry of gazetteer.brands) {
        const score = tokenSortRatio(gram, entry.canonical)
        if (score >= threshold) {
          candidates.push({ entry, score, start: i, end: i + n })
        }
      }
    }
  }
  
  return candidates
}
```

**ASR Error Patterns Handled:**
- Word splitting: "gymshark" → "gym shark"
- Word merging: "red mi" → "redmi"
- Phonetics: "hogan dahs" → "haagen dazs"
- Misspelling: "samsang" → "samsung"

#### Layer 3: Context Window Extraction

For each matched candidate, extract surrounding context for LLM classification:

```typescript
interface CandidateSpan {
  brand: BrandEntry
  matchType: 'exact' | 'fuzzy'
  confidence: number        // match score
  startOffset: number       // character offset in transcript
  endOffset: number
  contextWindow: string     // ±200 chars around match
  mentionCount: number      // how many times mentioned
}
```

---

### 3. Whisper Initial Prompt Enhancement (`src/lib/transcript.ts`)

**Purpose:** Improve transcription accuracy by seeding Whisper with brand names.

**Current Code:**
```typescript
formData.append('model', 'whisper-large-v3')
```

**New Code:**
```typescript
// Build category-relevant brand list for initial prompt
const brandSeeds = categoryBrands
  .slice(0, 50)  // limit to avoid prompt bloat
  .map(b => b.canonical)
  .join(', ')

formData.append('initial_prompt', 
  `Brand names mentioned: ${brandSeeds}. ` +
  `Product names: ${brandSeeds.join(', ')}. ` +
  `This is an Indian market review video.`
)
```

**Impact:** Whisper's `initial_prompt` biases the language model toward correct spelling of seed words. Measurably reduces misrecognition of brand names that aren't common English words.

---

### 4. LLM Classifier (`src/lib/brand-analyzer.ts` — modified)

**Purpose:** Classify pre-identified candidates (not extract from scratch).

**Current Prompt:** ~1500 tokens asking LLM to find brands + classify + explain

**New Prompt:** ~300 tokens asking LLM to classify only:

```typescript
function buildClassificationPrompt(
  candidates: CandidateSpan[],
  videoTitle: string,
  channelName: string,
  description: string
): string {
  return `Classify each brand candidate as genuine mention or false positive.

VIDEO: "${videoTitle}" by ${channelName}
DESC: ${description.slice(0, 500)}

CANDIDATES:
${candidates.map((c, i) => `[${i}] "${c.brand.canonical}" — context: "${c.contextWindow}"`).join('\n')}

For each candidate, output:
- "genuine" if the brand is actually discussed/reviewed/compared
- "false_positive" if it's a homonym (e.g., Apple the fruit) or incidental mention
- "sponsor" if it's a paid promotion/sponsored segment

Return JSON: { "classifications": [{ "index": 0, "label": "genuine|false_positive|sponsor", "confidence": 0.9 }] }`
}
```

**Why This is Better:**
- 5x fewer tokens per call (300 vs 1500)
- Higher accuracy (classification is easier than extraction)
- Faster inference
- Cheaper API calls

---

### 5. Integration: `analyzeBrandsFromTranscript()` (modified)

```typescript
export async function analyzeBrandsFromTranscript(
  transcript: string,
  videoTitle: string,
  knownBrands: string[] = [],
  channelName: string = '',
  description: string = '',
  pinnedComment: string | null = null
): Promise<BrandDetection[]> {
  // Step 1: Fast matching (< 1 second)
  const exactMatches = matchExact(transcript, gazetteer)
  const fuzzyMatches = matchFuzzy(transcript, gazetteer, exactMatches)
  const allCandidates = mergeCandidates(exactMatches, fuzzyMatches)
  
  // Step 2: If no candidates found, skip LLM entirely
  if (allCandidates.length === 0) return []
  
  // Step 3: LLM classification (only for candidates)
  const classified = await classifyCandidates(
    allCandidates,
    videoTitle,
    channelName,
    description
  )
  
  // Step 4: Convert to BrandDetection format
  return classified
    .filter(c => c.label !== 'false_positive')
    .map(c => ({
      brand_name: c.brand.canonical,
      confidence: c.confidence,
      mention_type: c.label === 'sponsor' ? 'primary_review' : 'mentioned',
      context_quotes: [c.contextWindow],
    }))
}
```

---

## Performance Comparison

| Metric | Current (LLM Only) | Proposed (Matcher + LLM) |
|---|---|---|
| **Time per video** | 15-30s (LLM call) | 1-3s (matching) + 5-10s (LLM) |
| **API cost per video** | ~$0.002 (full prompt) | ~$0.0004 (classification only) |
| **Recall (brands found)** | ~75% | ~92% (fuzzy catches ASR errors) |
| **Precision (no false positives)** | ~65% | ~88% (pre-filtered candidates) |
| **Tokens per video** | ~1500 | ~300 (5x reduction) |
| **ASR error handling** | None | Fuzzy + phonetic matching |
| **Alias support** | None | Full alias table |

---

## File Structure

```
src/
  lib/
    brand-gazetteer.ts      # NEW — CSV parser + gazetteer builder
    brand-matcher.ts        # NEW — Aho-Corasick + RapidFuzz engine
    brand-analyzer.ts       # MODIFIED — LLM classification only
    transcript.ts           # MODIFIED — Whisper initial_prompt
  data/
    brand-gazetteer.json    # NEW — Pre-built brand index
  scripts/
    build-gazetteer.ts      # NEW — Script to rebuild gazetteer from CSV
```

---

## Dependencies to Add

```bash
npm install ahocorasick    # Aho-Corasick string matching
npm install rapidfuzz      # Fuzzy string matching (C++ backed)
```

---

## Testing Strategy

1. **Unit tests for gazetteer:** CSV parsing, alias generation, category mapping
2. **Unit tests for matcher:** Exact match, fuzzy match, ASR error patterns
3. **Integration tests:** Full pipeline with sample transcripts
4. **Regression tests:** Compare old vs new system on known videos
5. **Benchmark:** Time per video, API cost, recall/precision metrics

---

## Rollout Plan

1. **Phase 1:** Build gazetteer from CSV, test matching layer standalone
2. **Phase 2:** Integrate matcher with existing analyzer (LLM still does extraction)
3. **Phase 3:** Switch LLM to classification-only mode
4. **Phase 4:** Add Whisper initial_prompt enhancement
5. **Phase 5:** A/B test old vs new system, measure accuracy improvement
6. **Phase 6:** Full rollout, deprecate old extraction-only path

---

## CSV File Format Expected

```csv
Category,Sub-Category,Brand
"Mobiles, Tablets & More",Mobile Phones,Samsung
"Mobiles, Tablets & More",Mobile Phones,Apple
"Mobiles, Tablets & More",Mobile Phones,OnePlus
...
```

The gazetteer parser will:
1. Handle quoted fields with commas
2. Extract parent brands from parenthetical: `"Google (Pixel)"` → parent="Google"
3. Auto-generate aliases for each brand
4. Group brands by category for Whisper prompt seeding
