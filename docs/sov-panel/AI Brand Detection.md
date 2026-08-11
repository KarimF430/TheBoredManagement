# SOV Panel 101 — AI Brand Detection System

## Complete Technical Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Brand Gazetteer (1,561 brands)](#3-brand-gazetteer)
4. [Matching Engine](#4-matching-engine)
5. [LLM Classification](#5-llm-classification)
6. [LLM Usage Tracking](#6-llm-usage-tracking)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [UI Components](#9-ui-components)
10. [Irrelevant Video System](#10-irrelevant-video-system)
11. [Cost Analysis](#11-cost-analysis)
12. [Accuracy & Optimization](#12-accuracy--optimization)
13. [Failure Handling](#13-failure-handling)
14. [File Reference](#14-file-reference)

---

## 1. System Overview

### What it does

Automatically detects brand mentions in YouTube video transcripts using:
- **Exact matching** (Aho-Corasick) for known brand names and aliases
- **Fuzzy matching** (Levenshtein distance) for ASR transcription errors
- **LLM classification** (GPT-4o-mini via OpenRouter) to confirm genuine mentions vs false positives

### Processing flow

```
YouTube Video
    ↓
Transcript Fetch (library → YouTube API → Whisper fallback)
    ↓
Irrelevant Detection (heuristics + LLM, ~200ms)
    ↓ Skip if irrelevant
Brand Gazetteer Lookup
    ↓
Aho-Corasick Exact Matching (all 1,561 brands + 1,915 aliases)
    ↓
Levenshtein Fuzzy Matching (for ASR errors)
    ↓
LLM Full Extraction (GPT-4o-mini classifies + extracts brands)
    ↓
Post-Processing (grounding, canonicalization, dedup, recall safety nets)
    ↓
Store Results (brand_analysis + brand_tags tables)
    ↓
Log Usage (llm_usage table — tokens, cost, latency per video)
```

### Performance at a glance

| Metric | Value |
|--------|-------|
| Matching speed (1000 videos) | ~13 seconds |
| LLM cost per video | ~$0.00064 |
| LLM cost per 1000 videos | ~$0.64 |
| LLM cost per 10,000 videos | ~$6.40 |
| Brands in gazetteer | 1,561 |
| Unique aliases | 1,915 |
| Memory per cold start | ~1 MB |

---

## 2. Architecture

### Component diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │  Leaderboard  │  │  AnalysisProgressBar             │ │
│  │  "AI Analyze  │  │  - Real-time progress updates    │ │
│  │   All" button │  │  - Cancel support                │ │
│  └──────┬───────┘  │  - Error details                  │ │
│         │          └──────────────────────────────────┘ │
└─────────┼───────────────────────────────────────────────┘
          │ POST /api/brands/analyze
          ↓
┌─────────────────────────────────────────────────────────┐
│                   API ROUTES (Next.js)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/brands/analyze   - Per-video analysis      │   │
│  │  /api/videos/ids       - Fetch all video IDs     │   │
│  │  /api/videos/leaderboard - Video list + filters  │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│                  CORE LIBRARIES                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ brand-matcher│  │ brand-gazette│  │ brand-analyzer │ │
│  │             │  │ er           │  │                │ │
│  │ Aho-Corasick│  │ CSV parser   │  │ LLM classif.   │ │
│  │ Levenshtein │  │ Alias gen    │  │ Irrelevant det │ │
│  │ Word bounds │  │ JSON index   │  │ Full extraction│ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
│         └────────┬───────┘                   │          │
│                  ↓                           │          │
│         ┌────────────────┐                   │          │
│         │ brand-gazetteer│───────────────────┘          │
│         │ .json (1561)   │                              │
│         └────────────────┘                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  llm-usage-monitor                              │   │
│  │  - Token counting per video                     │   │
│  │  - Cost calculation per call                    │   │
│  │  - Campaign-level summaries                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase)                    │
│  videos → brand_analysis → brand_tags                   │
│  videos → video_transcripts                             │
│  videos → video_blacklist (irrelevant content)          │
│  llm_usage (token tracking per video/campaign)          │
└─────────────────────────────────────────────────────────┘
```

### Data flow for "AI Analyze All"

```
User clicks "AI Analyze All"
    ↓
Frontend: GET /api/videos/ids?campaign_id=X&format=all&analyzed=unanalyzed
    ↓ Returns ALL unique video IDs (shorts + long format)
Frontend: Process in batches of 5
    ↓
For each batch:
  POST /api/brands/analyze { video_ids: [...], campaign_id: X }
    ↓
  API Route (per-video try/catch):
    For each video:
      1. Check is_irrelevant → skip if TRUE
      2. detectIrrelevantVideo() → store if irrelevant
      3. fetchTranscript() → library → API → Whisper
      4. matchBrandsFromTranscript() → candidates
      5. extractBrandNotes() → LLM extraction + classification
      6. refineDetections() → grounding, canonicalization, dedup
      7. recoverMissedCampaignBrands() → campaign brand recall
      8. recoverMissedGazetteerBrands() → gazetteer brand recall
      9. Store in brand_analysis + brand_tags
      10. Log to llm_usage (tokens, cost, latency)
    ↓
  Frontend: Update progress bar (processed/total, success/failed)
    ↓
After all batches: Progress bar shows "Complete"
```

---

## 3. Brand Gazetteer

### Source
- CSV file: `Amazon_India_Category_Brand_Master.csv`
- 800+ unique brands across 13 categories

### Categories (13)
| Category | Brand Count |
|----------|-------------|
| Men's Fashion | 214 |
| Beauty & Health | 189 |
| Home & Kitchen | 150 |
| Sports, Fitness & Outdoors | 149 |
| Electronics, TV, Audio & Cameras | 139 |
| Women's Fashion | 132 |
| Mobiles, Tablets & More | 130 |
| Computers & Accessories | 117 |
| Appliances | 85 |
| Toys & Baby Products | 93 |
| Car & Motorbike | 99 |
| Movies, Music & Video Games | 33 |
| Books | 31 |

### Generated data
| Metric | Count |
|--------|-------|
| Brand entries | 1,561 |
| Unique canonical brands | 948 |
| Unique aliases | 1,915 |

### How aliases are generated

The gazetteer generator (`scripts/build-gazetteer.js`) creates aliases from:

1. **CSV brand names** → lowercase canonical form
2. **Parent brand extraction** → "Samsung (Galaxy)" → parent: "Samsung", sub: "Galaxy"
3. **MANUAL_ALIASES map** → 500+ hand-curated aliases:
   - Product lines: `galaxy → Samsung`, `iphone → Apple`, `pixel → Google`
   - Indian spellings: `boat → boAt`, `realme → Realme`
   - Common ASR errors: `jio phone → Jio`, `redmi → Xiaomi`

### Files
- `scripts/build-gazetteer.js` — Build script (run `npm run build:gazetteer`)
- `data/brand-gazetteer.json` — Generated index (1561 brands, 1915 aliases)
- `src/lib/brand-gazetteer.ts` — Loader, CSV parser, alias generator

### Rebuilding
```bash
npm run build:gazetteer
# Reads: Amazon_India_Category_Brand_Master.csv
# Writes: data/brand-gazetteer.json
```

---

## 4. Matching Engine

### File: `src/lib/brand-matcher.ts`

### Layer 1: Aho-Corasick Exact Matching

The Aho-Corasick algorithm builds a finite state automaton from all 1,915 brand aliases. It scans the transcript in a single pass, finding ALL brand matches simultaneously.

```typescript
// Build automaton from gazetteer
const aho = new AhoCorasick(allPatterns) // 1,915 patterns

// Single-pass search
const results = aho.search(transcriptLower) // O(n) where n = transcript length
```

**Word boundary validation:**
After finding a match, we verify it's a complete word, not a substring:
```typescript
const charBefore = startPos > 0 ? transcriptLower[startPos - 1] : ' '
const charAfter = (endPos + 1) < transcriptLower.length ? transcriptLower[endPos + 1] : ' '
if (isWordChar(charBefore) || isWordChar(charAfter)) continue // Skip substring matches
```

This prevents false positives like "w" matching inside "weather".

### Layer 2: Levenshtein Fuzzy Matching

For words that didn't exact-match, we check edit distance against brand aliases:

```typescript
// Prefix-indexed lookup: only check aliases with matching first 2 chars
const prefix = word.slice(0, 2)
const bucket = fuzzyIndex.get(prefix) // ~50-100 candidates instead of 1,915

for (const { alias, brand } of bucket) {
  const dist = editDistance(word, alias) // Levenshtein with early exit
  if (dist <= 2) { // Allow up to 2 character edits
    results.push({ brand, distance: dist })
  }
}
```

**Performance optimizations:**
- Prefix indexing: groups aliases by first 2 characters → reduces search space 10x
- Length filter: skip if `|alias.length - word.length| > 2`
- Early exit: abort Levenshtein if entire row exceeds threshold
- Stopword filter: skip common English words (the, this, is, are, etc.)
- Min word length: only fuzzy-match words with 5+ characters

### Context window extraction

For each match, we extract surrounding context for the LLM:
```typescript
const context = extractContext(transcript, wordStart, wordEnd, 150)
// Returns: "...150 chars before MATCH 150 chars after..."
```

### Performance
| Transcript | Time | Candidates |
|-----------|------|------------|
| 25 words | 12ms | 5 |
| 63 words | 11ms | 16 |
| 259 words | 13ms | 49 |
| 1000 videos | ~13s | varies |

---

## 5. LLM Classification

### File: `src/lib/brand-analyzer.ts`

### Model

- **Model:** `openai/gpt-4o-mini` via OpenRouter
- **Provider:** OpenRouter (`https://openrouter.ai/api/v1`)
- **Temperature:** 0.1 (deterministic)
- **Max tokens:** 2000 (brand analysis) / 300 (irrelevance detection)

### Full Extraction Prompt

The LLM receives full context and extracts brands with reasoning:

```
You are TBM's senior market intelligence analyst. You've manually watched
thousands of Indian YouTube videos and written brand notes for client pitch decks.

═══ INPUT ═══
TITLE: {videoTitle}
CHANNEL: {channelName}
DESCRIPTION: {description}
PINNED COMMENT: {pinnedComment}
TRANSCRIPT: {truncatedTranscript}

BRANDS THIS CLIENT CARES ABOUT: {campaignBrands}
CANDIDATE BRANDS FOUND BY TEXT SEARCH: {candidateBrands}

═══ RULES ═══
- Retail platforms (Amazon, Flipkart, Meesho, etc.) are NEVER brands
- Generic category words are not brands
- Regional-language mentions carry identical weight to English
- Only tag brands that earn a place

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
}
```

### Post-Processing Pipeline

After the LLM returns results, multiple safety layers run:

1. **Grounding Check** — Verifies each brand appears in the source text (prevents hallucinations)
2. **Retail Platform Exclusion** — Amazon, Flipkart, Meesho, etc. are always filtered out
3. **Ambiguity Guard** — Brands that are also common words (AND, MAX, W) require exact brand casing
4. **Canonicalization** — Maps model spelling to master list ("boat" → "boAt", "kent ro" → "KENT")
5. **Deduplication** — Merged by canonical name, highest confidence kept

### Recall Safety Nets

1. **Campaign brands** — If a client's brand appears in the transcript but the LLM missed it, it's recovered at 0.55 confidence
2. **Gazetteer exact matches** — If the Aho-Corasick matcher found an exact hit the LLM missed, it's recovered at 0.50 confidence

### Mention types

| Type | Confidence | Description |
|------|-----------|-------------|
| `primary_review` | ≥ 0.9 | Main subject of the video |
| `comparison` | ≥ 0.7 | Compared with other products |
| `recommendation` | any | Explicitly recommended |
| `mentioned` | any | Briefly mentioned |

### Fallback chain

1. **Primary:** Aho-Corasick + Levenshtein → LLM full extraction
2. **Fallback 1:** If no transcript → Metadata-only analysis (title + channel + description)
3. **Fallback 2:** If LLM fails → Return empty array (no crash)

---

## 6. LLM Usage Tracking

### Overview

Every LLM API call is logged to the `llm_usage` table, tracking:
- Token usage (input, output, cached)
- Cost in USD (calculated from GPT-4o-mini pricing)
- Latency in milliseconds
- Per-video and per-campaign aggregation

This works like the YouTube API quota monitor (`quota-monitor.ts`) but for LLM costs.

### File: `src/lib/llm-usage-monitor.ts`

### What gets logged

| Call Type | When | Typical Tokens |
|-----------|------|----------------|
| `brand_analysis` | Every transcript analysis | ~1,500 input, ~500 output |
| `irrelevance_detection` | Every new video (not cached) | ~300 input, ~100 output |
| `metadata_analysis` | Videos without transcripts | ~500 input, ~300 output |

### Pricing (GPT-4o-mini via OpenRouter)

| Token Type | Price per 1M tokens |
|------------|---------------------|
| Input (cache miss) | $0.15 |
| Input (cached) | $0.075 |
| Output | $0.60 |

### Key Functions

```typescript
// Log an LLM call (called automatically by brand-analyzer.ts)
logLlmUsage({
  videoId: 'uuid',
  campaignId: 'uuid',
  callType: 'brand_analysis',
  model: 'openai/gpt-4o-mini',
  inputTokens: 1500,
  outputTokens: 500,
  cachedTokens: 0,
  latencyMs: 2300,
  success: true,
})

// Get summary (like getQuotaStatus for YouTube)
const summary = await getLlmUsageSummary(campaignId)
// Returns: totalCalls, totalCostUsd, avgLatencyMs, byModel, byCallType

// Get per-campaign breakdown
const campaigns = await getCampaignCostSummaries()

// Get per-video cost details
const videos = await getVideoCostDetails(campaignId)

// Get daily trend
const trend = await getDailyCostTrend(campaignId, 30)

// Estimate cost for N videos
const estimate = await estimateAnalysisCost(1000, campaignId)

// Generate full report
const report = await exportLlmUsageReport(campaignId)
```

### Database Views

| View | Purpose |
|------|---------|
| `llm_campaign_costs` | Total cost per campaign (all time) |
| `llm_video_costs` | Cost per video |
| `llm_daily_costs` | Daily cost trend by call type |
| `llm_usage_summary` | Materialized view for fast aggregation |

---

## 7. Database Schema

### Core tables

#### `videos`
```sql
videos (
  id UUID PRIMARY KEY,
  youtube_id TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  channel_name TEXT,
  channel_id TEXT,
  view_count INTEGER DEFAULT 0,
  duration_sec INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT FALSE,
  is_irrelevant BOOLEAN DEFAULT FALSE,
  irrelevant_reason TEXT,
  irrelevant_score REAL DEFAULT 0,
  irrelevant_category TEXT,
  irrelevant_detected_at TIMESTAMPTZ,
  brand_analysis_checked_at TIMESTAMPTZ
)
```

#### `brand_analysis` (AI detections)
```sql
brand_analysis (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  confidence REAL DEFAULT 0,
  mention_type TEXT DEFAULT 'mentioned',
  context_quotes TEXT[] DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### `brand_tags` (lightweight campaign-scoped tags)
```sql
brand_tags (
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  PRIMARY KEY(video_id, brand_name, campaign_id)
)
```

#### `video_transcripts`
```sql
video_transcripts (
  video_id UUID PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
  youtube_id TEXT,
  transcript_text TEXT,
  language TEXT DEFAULT 'en',
  fetch_status TEXT DEFAULT 'pending',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### `video_blacklist` (irrelevant content permanent blocklist)
```sql
video_blacklist (
  youtube_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'irrelevant',
  category TEXT,
  detected_by TEXT DEFAULT 'ai',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL
)
```

#### `llm_usage` (token tracking per video/campaign) — NEW
```sql
llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL,           -- 'brand_analysis' | 'irrelevance_detection' | 'metadata_analysis'
  model TEXT NOT NULL,               -- 'openai/gpt-4o-mini'
  provider TEXT NOT NULL DEFAULT 'openrouter',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  transcript_length INTEGER DEFAULT 0,
  candidate_count INTEGER DEFAULT 0,
  brands_detected INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 8. API Endpoints

### `POST /api/brands/analyze`

Analyzes one or more videos for brand mentions.

**Request:**
```json
{
  "video_ids": ["abc123", "def456"],
  "campaign_id": "camp_789",
  "force": false
}
```

**Response:**
```json
{
  "results": [
    {
      "youtube_id": "abc123",
      "status": "analyzed",
      "transcript_length": 4521,
      "language": "hi",
      "brands_detected": 3,
      "high_confidence_brands": ["Samsung", "boAt", "Apple"]
    },
    {
      "youtube_id": "def456",
      "status": "error",
      "error": "Transcript fetch failed"
    }
  ]
}
```

### `GET /api/brands/analyze?video_id=X`

Returns brand analysis for a specific video.

### `GET /api/brands/analyze?campaign_id=X`

Returns campaign-wide brand summary.

### `GET /api/videos/ids`

Fetches ALL video IDs for batch analysis.

**Params:**
- `campaign_id` (required)
- `format`: `all` | `long` | `short`
- `analyzed`: `all` | `analyzed` | `unanalyzed`

### `GET /api/videos/leaderboard`

Paginated video list with filters.

---

## 9. UI Components

### AnalysisProgressBar

**File:** `src/components/AnalysisProgressBar.tsx`

Fixed-position bottom bar showing real-time analysis progress.

**Features:**
- Animated progress bar with percentage
- Live stats: processed/total, success, failed, skipped
- Current video being processed
- Collapsible error details
- Cancel button during analysis
- Auto-dismiss after completion

### "AI Analyze All" Button Behavior

1. User clicks button → shows progress bar
2. Frontend fetches ALL unique video IDs from `/api/videos/ids`
3. Filters: respects current tab (All/Long/Short), excludes already-analyzed and irrelevant videos
4. Processes in batches of 5 via `/api/brands/analyze`
5. Updates progress bar after each batch
6. User can cancel at any time (stops after current batch)
7. On complete: refetches leaderboard to show new tags

---

## 10. Irrelevant Video System

### Detection layers

**Layer 1 — Instant heuristics (0ms, no LLM):**
| Pattern | Category | Score |
|---------|----------|-------|
| `#shorts` in title | shorts | 1.0 |
| Music keywords (song, lyrics, remix, audio) | music | 0.95 |
| Gaming keywords (gameplay, BGMI, Minecraft, GTA) | gaming | 0.9 |
| Live stream keywords (live, stream, podcast) | live_stream | 0.8 |

**Layer 2 — LLM classification (~200ms):**
- Sends title + channel + description to GPT-4o-mini
- Returns: `is_irrelevant`, `reason`, `score`, `category`
- Categories: shorts, music, gaming, non_review, foreign_language, live_stream, compilation, other

### Storage

When a video is detected as irrelevant:
1. `videos.is_irrelevant = TRUE` + reason + score + category
2. `video_blacklist` row created (permanent, keyed by youtube_id)

---

## 11. Cost Analysis

### GPT-4o-mini Pricing (OpenRouter)

| Token Type | Price per 1M tokens |
|------------|---------------------|
| Input (cache miss) | $0.15 |
| Input (cached) | $0.075 (50% discount) |
| Output | $0.60 |

### Per-Video Cost Breakdown

| Call Type | Input Tokens | Output Tokens | Cost |
|-----------|-------------|---------------|------|
| Brand analysis | ~1,500 | ~500 | $0.00053 |
| Irrelevance detection | ~300 | ~100 | $0.00011 |
| **Total per video** | **~1,800** | **~600** | **~$0.00064** |

### Scale Costs

| Videos | Cost |
|--------|------|
| 100 | $0.064 |
| 1,000 | $0.64 |
| 5,000 | $3.20 |
| 10,000 | $6.40 |
| 50,000 | $32.00 |

### With Prompt Caching

If prompt caching is enabled (repeated system prefix):
- Input cost drops from $0.15/M to $0.075/M for cached tokens
- Estimated savings: 30-40% on input tokens
- **Total per video with caching: ~$0.00045**

### LLM Usage Tracking

All costs are tracked in the `llm_usage` table via `llm-usage-monitor.ts`. Use the API to query:
- Cost per video
- Cost per campaign
- Daily cost trends
- Estimate future costs

---

## 12. Accuracy & Optimization

### Current System Accuracy (Estimated)

| Metric | Current | Target |
|--------|---------|--------|
| Recall (brands found) | ~75% | 90% |
| Precision (no false positives) | ~65% | 90% |

### Why Accuracy Is Lower Than Expected

1. **Full extraction mode** — LLM searches for brands from scratch instead of classifying pre-identified candidates
2. **No Whisper brand seeding** — ASR misrecognizes brand names that aren't common English
3. **Gazetteer coverage gaps** — Some brands (Aquaguard, Livpure, AO Smith) not in the Amazon CSV
4. **No confidence calibration** — LLM confidence scores don't reflect actual accuracy

### Roadmap to 90% Accuracy

#### Phase 1: Classification-Only Mode (Impact: +15% precision)
The architecture doc designed this but it was never implemented:
- Aho-Corasick + Levenshtein find candidates (~13ms, free)
- LLM only classifies candidates (genuine/false_positive/sponsor)
- Drops from ~1,500 tokens to ~300 tokens per call
- **Accuracy improves** because classification is easier than extraction

#### Phase 2: Whisper Brand Seeding (Impact: +10% recall)
Already partially implemented in `transcript.ts`:
- Inject brand names into Whisper `initial_prompt`
- Improves ASR accuracy for brand names
- Especially important for Indian language content

#### Phase 3: Gazetteer Expansion (Impact: +5% recall)
- Add missing brands not in the Amazon CSV
- Expand MANUAL_ALIASES for common ASR errors
- Add phonetic variants for Hindi/Marathi/Tamil brand pronunciations

#### Phase 4: Confidence Calibration (Impact: +10% precision)
- Track prediction vs actual accuracy per confidence bucket
- Adjust confidence thresholds based on real data
- Lower threshold for campaign brands, raise for non-campaign

#### Phase 5: A/B Testing Framework
- Compare old vs new detection on known videos
- Measure precision/recall with human-labeled test set
- Track accuracy over time per model version

### Testing Approach

1. **Unit tests** for gazetteer, matcher, analyzer (existing: `brand-analyzer.test.ts`, `brand-matcher.test.ts`)
2. **Integration tests** with sample transcripts
3. **Regression tests** comparing detection results across code changes
4. **Human-labeled test set** of 100+ known videos with verified brand mentions

---

## 13. Failure Handling

### Per-video isolation
- `brands/analyze/route.ts`: Each video wrapped in try/catch
- If video #50 fails, videos #51-1000 still process
- Error stored in results array, not thrown

### Retry with backoff
- `transcript.ts`: `fetchTranscript()` wrapped in `withRetry()`
- 2 retries, exponential backoff (2s, 4s), jitter
- Each retry tries all 3 transcript methods

### Transcript fallback chain
1. youtube-transcript library (11 languages, fastest)
2. YouTube Data API captions (OAuth)
3. Whisper speech-to-text (slowest, works for all languages)

### Irrelevant video fast-path
- Heuristics catch 80%+ of irrelevant content instantly (0ms)
- No LLM call needed for obvious cases (shorts, music, gaming)
- Saves API quota and processing time

### LLM usage logging failure
- `logLlmUsage()` is fire-and-forget — never crashes the main flow
- Usage logging errors are caught and logged to console only

---

## 14. File Reference

### Core brand detection
| File | Purpose |
|------|---------|
| `src/lib/brand-gazetteer.ts` | CSV parser, alias generator, gazetteer loader |
| `src/lib/brand-matcher.ts` | Aho-Corasick + Levenshtein matching engine |
| `src/lib/brand-analyzer.ts` | LLM extraction + classification + irrelevant detection |
| `src/lib/llm-usage-monitor.ts` | Token tracking, cost calculation, usage summaries |
| `data/brand-gazetteer.json` | Pre-built brand index (1561 brands) |
| `scripts/build-gazetteer.js` | Gazetteer build script |

### API routes
| File | Purpose |
|------|---------|
| `src/app/api/brands/analyze/route.ts` | POST: analyze videos for brands |
| `src/app/api/videos/ids/route.ts` | GET: fetch all video IDs for batch |
| `src/app/api/videos/leaderboard/route.ts` | GET: paginated video list |

### UI
| File | Purpose |
|------|---------|
| `src/components/AnalysisProgressBar.tsx` | Progress bar component |
| `src/app/leaderboard/page.tsx` | Leaderboard with "AI Analyze All" |

### Infrastructure
| File | Purpose |
|------|---------|
| `src/lib/retry.ts` | Retry-with-backoff utility |
| `src/lib/transcript.ts` | Transcript fetching (3 methods) |
| `src/lib/scrape-pipeline-pg.ts` | Scrape pipeline with blacklist filtering |
| `vercel.json` | Vercel deployment config |

### Database
| File | Purpose |
|------|---------|
| `schema/FULL_MIGRATION.sql` | Base schema |
| `schema/004_performance_indexes.sql` | Performance indexes |
| `schema/006_brand_index_and_irrelevant.sql` | Brand analysis index + irrelevant video tables |
| `schema/010_llm_usage_tracking.sql` | LLM usage tracking tables + views |

### Tests
| File | Purpose |
|------|---------|
| `src/lib/brand-analyzer.test.ts` | Brand analyzer tests |
| `src/lib/brand-matcher.test.ts` | Brand matcher tests |

---

## Quick Start

### 1. Build gazetteer
```bash
npm run build:gazetteer
```

### 2. Run database migrations
Paste `schema/006_brand_index_and_irrelevant.sql` into Supabase SQL Editor.
Paste `schema/010_llm_usage_tracking.sql` into Supabase SQL Editor.

### 3. Set environment variables
```env
OPENROUTER_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GROQ_API_KEY=your_groq_key_here
```

### 4. Deploy to Vercel
```bash
vercel deploy --prod
```

### 5. Use
1. Go to Leaderboard page
2. Select a campaign
3. Click "AI Analyze All"
4. Watch the progress bar
5. Check `llm_usage` table for cost tracking
