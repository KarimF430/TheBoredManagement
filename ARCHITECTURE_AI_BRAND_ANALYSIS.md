# AI Brand Analysis — Architecture Document

## Overview

This document describes the **implemented** AI brand detection system used in SOV Panel 101. The system detects brand mentions in YouTube video transcripts using a hybrid approach: deterministic text matching (Aho-Corasick + Levenshtein) combined with LLM classification (GPT-4o-mini via OpenRouter).

---

## System Architecture

```
                         ┌─────────────────────┐
                         │   CSV Brand List     │
                         │ (Category-Sub-Brand) │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  Brand Gazetteer     │
                         │  - 1,561 brands      │
                         │  - 1,915 aliases     │
                         │  - 500+ hand-curated │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
   ┌──────────▼──────────┐ ┌───────▼────────┐ ┌─────────▼────────┐
   │  Aho-Corasick Index │ │  Levenshtein   │ │  Whisper Prompt  │
   │  (Exact Matching)   │ │  (Fuzzy)       │ │  (Brand Seeds)   │
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
              │  LLM Full Extract   │
              │  (GPT-4o-mini)      │
              │  via OpenRouter     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  Post-Processing    │
              │  - Grounding check  │
              │  - Canonicalization │
              │  - Dedup            │
              │  - Recall nets      │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  BrandDetection[]   │
              │  (Final Output)     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  LLM Usage Logger   │
              │  (tokens, cost)     │
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

**CSV Parsing:**
- Parse `Category,Sub-Category,Brand` columns
- Handle quoted fields with commas: `"Mobiles, Tablets & More"`
- Extract parent brand from parenthetical: `"Google (Pixel)"` → parent="Google", display="Ali"

**Alias Generation:**
1. CSV brand names → lowercase canonical form
2. Parent brand extraction from parenthetical
3. `MANUAL_ALIASES` map → 500+ hand-curated aliases:
   - Product lines: `galaxy → Samsung`, `iphone → Apple`, `pixel → Google`
   - Indian spellings: `boat → boAt`, `realme → Realme`
   - Common ASR errors: `jio phone → Jio`, `redmi → Xiaomi`

---

### 2. Brand Matcher (`src/lib/brand-matcher.ts`)

**Purpose:** Fast candidate detection using exact + fuzzy matching.

#### Layer 1: Aho-Corasick Exact Matching

**Why Aho-Corasick:**
- Single O(n) pass through transcript regardless of brand list size
- Handles overlapping matches (e.g., "Samsung Galaxy" matches both)
- ~100x faster than regex for large pattern sets

```typescript
const ac = new AhoCorasick()
for (const entry of gazetteer.brands) {
  ac.add(entry.canonical.toLowerCase(), entry)
  for (const alias of entry.aliases) {
    ac.add(alias.toLowerCase(), entry)
  }
}
const matches = ac.search(transcriptLower)
```

**Word boundary validation:** Prevents false positives like "w" matching inside "weather".

#### Layer 2: Levenshtein Fuzzy Matching

**Why Levenshtein:**
- Catches ASR errors that exact matching misses
- Prefix-indexed: groups aliases by first 2 chars → reduces search space 10x
- Max edit distance: 2 characters

```typescript
const prefix = word.slice(0, 2)
const bucket = fuzzyIndex.get(prefix)
for (const { alias, brand } of bucket) {
  const dist = editDistance(word, alias)
  if (dist <= 2) results.push({ brand, distance: dist })
}
```

**ASR Error Patterns Handled:**
- Word splitting: "gymshark" → "gym shark"
- Word merging: "red mi" → "redmi"
- Misspelling: "samsang" → "samsung"

#### Performance

| Transcript | Time | Candidates |
|-----------|------|------------|
| 25 words | 12ms | 5 |
| 63 words | 11ms | 16 |
| 259 words | 13ms | 49 |
| **1000 videos** | **~13s** | varies |

---

### 3. Whisper Initial Prompt (`src/lib/transcript.ts`)

**Purpose:** Improve transcription accuracy by seeding Whisper with brand names.

```typescript
const brandSeeds = getBrandsForWhisper()
  .slice(0, 50)
  .map(b => b.canonical)
  .join(', ')

formData.append('initial_prompt', 
  `Brand names mentioned: ${brandSeeds}. ` +
  `Product names: ${brandSeeds}. ` +
  `This is an Indian market review video.`
)
```

**Impact:** Whisper's `initial_prompt` biases the language model toward correct spelling of seed words.

---

### 4. LLM Classifier (`src/lib/brand-analyzer.ts`)

**Model:** `openai/gpt-4o-mini` via OpenRouter

**Prompt:** Full extraction mode — LLM receives transcript, title, channel, description, pinned comment, campaign brands, and candidate brands from text search. Returns JSON with video format and brand notes.

```typescript
const completion = await getOpenAI().chat.completions.create({
  model: 'openai/gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.1,
  max_tokens: 2000,
})
```

**Post-Processing Pipeline:**
1. **Grounding Check** — Verifies brand appears in source text
2. **Retail Platform Exclusion** — Amazon, Flipkart, etc. always filtered
3. **Ambiguity Guard** — Common words need exact brand casing
4. **Canonicalization** — Maps to master list spelling
5. **Deduplication** — Merged by canonical name

**Recall Safety Nets:**
1. Campaign brands recovered at 0.55 confidence if missed
2. Gazetteer exact matches recovered at 0.50 confidence

---

### 5. LLM Usage Monitoring (`src/lib/llm-usage-monitor.ts`)

**Purpose:** Track token usage, cost, and latency per video and per campaign.

**How it works:**
- Every LLM call logs to `llm_usage` table
- Cost calculated from GPT-4o-mini pricing: $0.15/M input, $0.60/M output, $0.075/M cached
- Fire-and-forget — never crashes main flow

**Key Functions:**
```typescript
logLlmUsage(log)           // Log a single call
getLlmUsageSummary(campaignId)  // Get usage summary
getCampaignCostSummaries()      // All campaigns
getVideoCostDetails(campaignId) // Per-video breakdown
estimateAnalysisCost(1000)      // Estimate N videos
```

---

## Cost Analysis

### GPT-4o-mini Pricing (OpenRouter)

| Token Type | Price per 1M tokens |
|------------|---------------------|
| Input (cache miss) | $0.15 |
| Input (cached) | $0.075 |
| Output | $0.60 |

### Per-Video Cost

| Component | Input Tokens | Output Tokens | Cost |
|-----------|-------------|---------------|------|
| Brand analysis | ~1,500 | ~500 | $0.00053 |
| Irrelevance detection | ~300 | ~100 | $0.00011 |
| **Total** | **~1,800** | **~600** | **~$0.00064** |

### Scale Costs

| Videos | Current Cost | With Caching |
|--------|-------------|--------------|
| 1,000 | $0.64 | $0.45 |
| 10,000 | $6.40 | $4.50 |
| 50,000 | $32.00 | $22.50 |

---

## Accuracy Roadmap

### Current (Estimated): ~75% recall, ~65% precision

### Target: 90% recall, 90% precision

| Phase | Change | Impact |
|-------|--------|--------|
| 1 | Classification-only mode (LLM classifies, not extracts) | +15% precision |
| 2 | Whisper brand seeding (better ASR) | +10% recall |
| 3 | Gazetteer expansion (missing brands) | +5% recall |
| 4 | Confidence calibration (real data thresholds) | +10% precision |
| 5 | A/B testing framework | Measure & iterate |

---

## File Structure

```
src/
  lib/
    brand-gazetteer.ts      # CSV parser + gazetteer builder
    brand-matcher.ts        # Aho-Corasick + Levenshtein engine
    brand-analyzer.ts       # LLM extraction + classification
    llm-usage-monitor.ts    # Token tracking + cost logging
    transcript.ts           # Transcript fetching (3 methods)
  data/
    brand-gazetteer.json    # Pre-built brand index (1561 brands)
  scripts/
    build-gazetteer.js      # Gazetteer build script
  schema/
    010_llm_usage_tracking.sql  # LLM usage tables
```

---

## Dependencies

```json
{
  "ahocorasick": "^2.0.0",
  "openai": "^6.46.0",
  "youtube-transcript": "^1.2.1"
}
```

Note: Levenshtein is implemented in `brand-matcher.ts` (no external dependency). The `rapidfuzz` package mentioned in earlier design docs was NOT used — the system uses a custom Levenshtein implementation with prefix indexing.

---

## Testing

### Unit Tests (existing)
- `src/lib/brand-analyzer.test.ts` — Brand analyzer tests
- `src/lib/brand-matcher.test.ts` — Brand matcher tests

### Integration Testing
- Full pipeline with sample transcripts
- Regression tests comparing detection results

### Accuracy Measurement
- Human-labeled test set of 100+ known videos
- Track precision/recall per confidence bucket
- Compare old vs new detection on known videos

---

## Deployment

### Vercel Configuration
```json
{
  "functions": {
    "src/app/api/brands/analyze/route.ts": {
      "maxDuration": 120,
      "memory": 2048
    }
  }
}
```

### Cold Start Performance
| Component | Time |
|-----------|------|
| Gazetteer reload | ~50ms |
| Aho-Corasick rebuild | ~50ms |
| Fuzzy index build | ~20ms |
| **Total** | **~120ms** |

### Database Migrations Required
1. `schema/006_brand_index_and_irrelevant.sql` — Brand analysis indexes + irrelevant video tables
2. `schema/010_llm_usage_tracking.sql` — LLM usage tracking tables + views
