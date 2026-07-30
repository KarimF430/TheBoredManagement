# SOV Panel 101 — AI Brand Detection System

## Complete Technical Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Brand Gazetteer (1,561 brands)](#3-brand-gazetteer)
4. [Matching Engine](#4-matching-engine)
5. [LLM Classification](#5-llm-classification)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [UI Components](#8-ui-components)
9. [Irrelevant Video System](#9-irrelevant-video-system)
10. [Vercel Deployment](#10-vercel-deployment)
11. [Performance Benchmarks](#11-performance-benchmarks)
12. [Failure Handling](#12-failure-handling)
13. [File Reference](#13-file-reference)

---

## 1. System Overview

### What it does

Automatically detects brand mentions in YouTube video transcripts using:
- **Exact matching** (Aho-Corasick) for known brand names and aliases
- **Fuzzy matching** (Levenshtein distance) for ASR transcription errors
- **LLM classification** (Gemma via OpenRouter) to confirm genuine mentions vs false positives

### How it differs from the old system

| Aspect | Old (Pure LLM) | New (Matching + LLM) |
|--------|----------------|----------------------|
| Speed | ~1500 tokens/call | ~300 tokens/call |
| Accuracy | LLM hallucination risk | Gazetteer-verified candidates |
| Brand coverage | LLM's training data | 1,561 brands from CSV |
| ASR error handling | None | Fuzzy matching with edit distance |
| Cost per video | High (full extraction) | Low (classification only) |
| 1000 videos | ~75 minutes | ~13 seconds matching + LLM calls |

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
LLM Classification (Gemini classifies candidates as genuine/false_positive/sponsor)
    ↓
Store Results (brand_analysis + brand_tags tables)
```

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
│  │ Word bounds │  │ JSON index   │  │ Full fallback  │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
│         └────────┬───────┘                   │          │
│                  ↓                           │          │
│         ┌────────────────┐                   │          │
│         │ brand-gazetteer│───────────────────┘          │
│         │ .json (1561)   │                              │
│         └────────────────┘                              │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase)                    │
│  videos → brand_analysis → brand_tags                   │
│  videos → video_transcripts                             │
│  videos → video_blacklist (irrelevant content)          │
│  keyword_videos + keyword_shorts (both formats)         │
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
      5. classifyCandidates() → LLM confirmation
      6. Store in brand_analysis + brand_tags
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

### Why classification instead of extraction

The old system asked the LLM to "extract all brands from this transcript." This was:
- Expensive (~1500 tokens per call)
- Inaccurate (LLM hallucinates brands not in the transcript)
- Slow (one call per video)

The new system asks: "Here are 5 candidates from the gazetteer. Are they genuine mentions?"

### Classification prompt

```
You are a brand mention classifier. For each candidate, classify as:
- "genuine": Brand is actually discussed, reviewed, compared, or recommended
- "false_positive": Homonym (Apple the fruit), incidental mention
- "sponsor": Paid promotion, sponsored segment

Key rules:
- Retail platforms (Amazon, Flipkart) are ALWAYS false_positive
- Generic words ("a mixer grinder") are false_positive
- Campaign brands should get higher confidence if genuinely present
```

### Mention types

| Type | Confidence | Description |
|------|-----------|-------------|
| `primary_review` | ≥ 0.9 | Main subject of the video |
| `comparison` | ≥ 0.7 | Compared with other products |
| `recommendation` | any | Explicitly recommended |
| `mentioned` | any | Briefly mentioned |

### Fallback chain

1. **Primary**: Aho-Corasick + Levenshtein → LLM classification
2. **Fallback 1**: If matcher fails → Full LLM extraction (old method)
3. **Fallback 2**: If no transcript → Metadata-only analysis (title + channel + description)

### Model
- `google/gemma-4-26b-a4b-it:free` via OpenRouter
- Temperature: 0.1 (deterministic)
- Max tokens: 1500 (classification) / 2000 (full extraction)

---

## 6. Database Schema

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
  is_irrelevant BOOLEAN DEFAULT FALSE,      -- NEW
  irrelevant_reason TEXT,                     -- NEW
  irrelevant_score REAL DEFAULT 0,            -- NEW
  irrelevant_category TEXT,                   -- NEW
  irrelevant_detected_at TIMESTAMPTZ         -- NEW
)
```

#### `brand_analysis` (AI detections)
```sql
brand_analysis (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  confidence REAL DEFAULT 0,
  mention_type TEXT DEFAULT 'mentioned',  -- primary_review|comparison|mentioned|recommendation
  context_quotes TEXT[] DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
)
-- INDEX: idx_ba_video_id on (video_id) INCLUDE (brand_name, confidence, mention_type)
-- INDEX: idx_ba_brand_video on (brand_name, video_id) INCLUDE (confidence, mention_type)
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

#### `video_blacklist` (irrelevant content permanent blocklist) — NEW
```sql
video_blacklist (
  youtube_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'irrelevant',
  category TEXT,           -- shorts|music|gaming|non_review|etc
  detected_by TEXT DEFAULT 'ai',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL
)
```

### Query: "Show me all brands in video X"

```sql
SELECT brand_name, confidence, mention_type, context_quotes
FROM brand_analysis
WHERE video_id = '<uuid>'
ORDER BY confidence DESC
```

### Query: "How many videos mention brand Y"

```sql
SELECT COUNT(DISTINCT video_id) as video_count
FROM brand_analysis
WHERE brand_name = 'Samsung' AND confidence >= 0.6
```

---

## 7. API Endpoints

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

**Per-video try/catch:** If video #50 fails, videos #51+ still process.

### `GET /api/videos/ids`

Fetches ALL video IDs for batch analysis.

**Params:**
- `campaign_id` (required)
- `format`: `all` | `long` | `short`
- `analyzed`: `all` | `analyzed` | `unanalyzed`

**Response:**
```json
{
  "total": 847,
  "videos": [
    {
      "id": "uuid",
      "youtube_id": "abc123",
      "title": "Samsung S24 Review",
      "channel_name": "TechReviewer",
      "description": "..."
    }
  ]
}
```

### `GET /api/videos/leaderboard`

Paginated video list with filters.

**Params:** `campaign_id`, `tab` (all/long/short), `sort` (views/rank/frequency), `page`, `limit`, `brand_name`, `keyword_id`, `channel_name`, `q`, `is_ours`

---

## 8. UI Components

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

**States:**
| Phase | Display |
|-------|---------|
| `starting` | "Preparing analysis..." + spinner |
| `analyzing` | "Analyzing videos... 45%" + progress bar |
| `complete` | "Analysis complete" + green checkmark |
| `error` | "Analysis stopped" + warning icon |

### "AI Analyze All" Button Behavior

1. User clicks button → shows progress bar
2. Frontend fetches ALL unique video IDs from `/api/videos/ids`
3. Filters: respects current tab (All/Long/Short), excludes already-analyzed and irrelevant videos
4. Processes in batches of 5 via `/api/brands/analyze`
5. Updates progress bar after each batch
6. User can cancel at any time (stops after current batch)
7. On complete: refetches leaderboard to show new tags

---

## 9. Irrelevant Video System

### Detection layers

**Layer 1 — Instant heuristics (0ms, no LLM):**
| Pattern | Category | Score |
|---------|----------|-------|
| `#shorts` in title | shorts | 1.0 |
| Music keywords (song, lyrics, remix, audio) | music | 0.95 |
| Gaming keywords (gameplay, BGMI, Minecraft, GTA) | gaming | 0.9(title) |
| Live stream keywords (live, stream, podcast) | live_stream | 0.8 |

**Layer 2 — LLM classification (~200ms):**
- Sends title + channel + description to Gemma
- Returns: `is_irrelevant`, `reason`, `score`, `category`
- Categories: shorts, music, gaming, non_review, foreign_language, live_stream, compilation, other

### Storage

When a video is detected as irrelevant:
1. `videos.is_irrelevant = TRUE` + reason + score + category
2. `video_blacklist` row created (permanent, keyed by youtube_id)

### Filtering during scraping

```
Search results → Filter brand channels → Filter blacklist → Filter is_irrelevant → Process
```

### Filtering during analysis

```
For each video:
  1. Check is_irrelevant → skip immediately
  2. Run detectIrrelevantVideo() → if irrelevant, store + skip
  3. If relevant → proceed with transcript + brand analysis
```

---

## 10. Vercel Deployment

### Configuration (`vercel.json`)

```json
{
  "functions": {
    "src/app/api/brands/analyze/route.ts": {
      "maxDuration": 120,
      "memory": 2048
    },
    "src/app/api/cron/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Compatibility

| Component | Vercel Status | Notes |
|-----------|--------------|-------|
| Aho-Corasick | ✅ Works | Pure JavaScript |
| Fuzzy matcher | ✅ Works | Pure computation |
| Gazetteer JSON | ✅ Works | Bundled in serverless |
| OpenRouter API | ✅ Works | HTTP-based |
| Supabase | ✅ Works | HTTP REST API |
| better-sqlite3 | ⚠️ Dead code | Migrated to Supabase |
| yt-dlp (Whisper) | ⚠️ Dead code | Falls back gracefully |
| BullMQ workers | ⚠️ Dead code | Cron routes bypass workers |

### Cold start
- Gazetteer reloads from disk: ~50ms
- Aho-Corasick rebuild: ~50ms
- Fuzzy index build: ~20ms
- **Total cold start overhead: ~120ms**

---

## 11. Performance Benchmarks

### Matching speed
| Transcript | Words | Time | Candidates |
|-----------|-------|------|------------|
| Short clip | 25 | 12ms | 5 |
| Medium review | 63 | 11ms | 16 |
| Long haul | 259 | 13ms | 49 |
| **1000 videos** | ~200 avg | **~13s** | varies |

### Memory
| Component | Size |
|-----------|------|
| Gazetteer JSON | 314 KB |
| Aho-Corasick automaton | ~500 KB |
| Fuzzy prefix index | ~200 KB |
| **Total per cold start** | **~1 MB** |

### LLM cost per video
| Method | Tokens | Cost |
|--------|--------|------|
| Old (full extraction) | ~1500 | $0.003 |
| New (classification) | ~300 | $0.0006 |
| **Savings** | **80%** | **80%** |

---

## 12. Failure Handling

### Per-video isolation
- `brands/analyze/route.ts`: Each video wrapped in try/catch
- If video #50 fails, videos #51-1000 still process
- Error stored in results array, not thrown

### Batch isolation
- `runDailyViewUpdatePg`: Each batch of 50 wrapped in try/catch
- One failed API batch doesn't kill the entire update

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

---

## 13. File Reference

### Core brand detection
| File | Purpose |
|------|---------|
| `src/lib/brand-gazetteer.ts` | CSV parser, alias generator, gazetteer loader |
| `src/lib/brand-matcher.ts` | Aho-Corasick + Levenshtein matching engine |
| `src/lib/brand-analyzer.ts` | LLM classification + irrelevant detection |
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

---

## Quick Start

### 1. Build gazetteer
```bash
npm run build:gazetteer
```

### 2. Run database migration
Paste `schema/006_brand_index_and_irrelevant.sql` into Supabase SQL Editor.

### 3. Set environment variables
```env
OPENROUTER_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
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
