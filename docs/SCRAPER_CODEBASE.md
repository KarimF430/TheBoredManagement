# Complete Scraper Codebase Documentation

> **Version:** 2.0 | **Last Updated:** August 2026
> **Platforms:** Instagram + YouTube | **Status:** Production Ready

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Instagram Scraper](#instagram-scraper)
4. [YouTube Scraper](#youtube-scraper)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Deployment Guide](#deployment-guide)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      SCRAPER PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Instagram   │    │   YouTube    │    │   CSV Import     │  │
│  │   Scraper     │    │   Scraper    │    │   (Manual)       │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
│         │                   │                     │             │
│         ▼                   ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              cp_raw_creators (all profiles)              │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           cp_filtered_creators (passed filters)          │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              cp_creator_pool (CRM database)              │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           outreach_creators (outreach pipeline)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Scrape** → Raw profiles stored in `cp_raw_creators`
2. **Filter** → Profiles passing thresholds stored in `cp_filtered_creators`
3. **Bridge** → Push to `cp_creator_pool` (CRM) or `outreach_creators` (email pipeline)
4. **Campaign** → Select creators, assign template, launch email campaign

---

## Directory Structure

```
src/
├── lib/
│   ├── scraper.ts                    # Instagram GraphQL scraper (TypeScript)
│   ├── scraper-worker.ts             # Node.js worker for Python subprocess
│   ├── youtube-scraper.ts            # YouTube Data API scraper (NEW)
│   ├── youtube.ts                    # YouTube search + video details
│   ├── youtube-api.ts                # YouTube channel/video fetching
│   ├── youtube-oauth.ts              # YouTube OAuth integration
│   ├── cp-db.ts                      # Campaign Panel database client
│   └── discovery.ts                  # Creator scoring engine
│
├── app/
│   ├── api/
│   │   ├── scraper/
│   │   │   ├── route.ts              # Instagram scraper API
│   │   │   └── youtube/
│   │   │       └── route.ts          # YouTube scraper API (NEW)
│   │   └── outreach/
│   │       └── creators/
│   │           └── bridge/
│   │               └── route.ts      # Scraper → Outreach bridge
│   │
│   └── scraper/
│       ├── page.tsx                  # Scraper dashboard
│       ├── new/page.tsx              # New Instagram scrape job
│       ├── jobs/page.tsx             # Job list
│       ├── results/page.tsx          # Raw scraped profiles
│       ├── filtered/page.tsx         # Filtered creators
│       ├── cookies/page.tsx          # Session cookie management
│       ├── workers/page.tsx          # Active worker monitoring
│       └── youtube/page.tsx          # YouTube scraper UI (NEW)
│
├── workers/
│   ├── processor.ts                  # Queue processor
│   ├── followupEngine.ts             # Follow-up scheduling
│   ├── rampGovernor.ts               # Volume ramp control
│   ├── replyCapture.ts               # Gmail reply capture
│   ├── replyClassifier.ts            # GPT reply classification
│   └── monitor.ts                    # Health monitoring
│
schema/
├── 013_creator_pool.sql              # Creator pool (CRM) schema
├── 017_scraper_pipeline.sql          # Scraper pipeline schema
├── 018_outreach_system.sql           # Outreach system schema
└── 020_outreach_campaigns.sql        # Campaigns schema

scraper_worker.py                     # Python Instagram scraper (instaloader)
scraper-robust.js                     # Puppeteer Instagram scraper
package-scraper.json                  # Puppeteer dependencies
```

---

## Instagram Scraper

### Implementation 1: TypeScript GraphQL (`src/lib/scraper.ts`)

**Best for:** Server-side, no browser required, fastest

```typescript
// Key exports:
export async function scrapeProfile(handle: string): Promise<ScrapedProfile | null>
export async function scrapeFromJob(jobId: string): Promise<void>
```

**How it works:**
1. Fetches Instagram GraphQL API with session cookies
2. Two-pass scraping:
   - **Pass 1:** Profile metadata (1 request per profile)
   - **Pass 2:** Last 10 posts for avg views (10 requests per profile)
3. Round-robin cookie rotation from `cp_session_cookies`
4. Rate limiting: 1.5-4s delay, 30 req/min, 200 req/hr
5. Circuit breaker: auto-pauses on 3 consecutive failures or 30%+ error rate

**Filter Pipeline:**
```
Pass 1 Filter (profile-level):
  ✓ Followers: 5,000 - 2,000,000
  ✓ Not private
  ✓ Has bio
  ✓ Has profile pic
  ✓ Not verified (optional)

Pass 2 Filter (content-level):
  ✓ Avg views / followers ratio > 0.1
  ✓ Engagement rate > 1%
  ✓ Posts count > 10
```

### Implementation 2: Python Worker (`scraper_worker.py`)

**Best for:** Robust scraping with cookie rotation, checkpoint/resume

```bash
# Run directly:
python scraper_worker.py --seed handle --depth 2 --max 500

# CSV mode:
python scraper_worker.py --mode csv --input handles.csv
```

**Features:**
- `instaloader` library for reliable Instagram access
- Multi-cookie rotation with exponential backoff
- Session warming (gradual speed increase for first 10 minutes)
- Checkpoint/resume (saves every 10 profiles to DB)
- Fetches last 10 video posts per profile
- Two login modes: username/password or session cookie injection

### Implementation 3: Puppeteer Scraper (`scraper-robust.js`)

**Best for:** When GraphQL API is blocked, need real browser

```bash
# Install dependencies:
npm install --prefix . -p package-scraper.json

# Run:
node scraper-robust.js --seed handle --depth 2
```

**Features:**
- `puppeteer-extra` with stealth plugin
- Auto-login with Instagram credentials
- Session persistence to disk and Supabase
- CSV input/output for batch processing
- Scrapes LD+JSON metadata from profile pages

---

## YouTube Scraper

### Core Module (`src/lib/youtube-scraper.ts`)

**Search Modes:**

| Mode | Description | Quota Cost |
|------|-------------|------------|
| `keyword_videos` | Search videos → extract channels | ~100 units |
| `keyword_channels` | Search channels directly | ~100 units |
| `channel_crawl` | BFS from seed channel | ~200 units |

**Key Functions:**

```typescript
// Search for channels via keyword
export async function searchYouTubeChannels(keyword, maxResults, regionCode)
export async function searchYouTubeVideos(keyword, maxResults, regionCode)

// Fetch full channel details + video stats
export async function fetchChannelBatch(channelIds: string[]): Promise<YouTubeScrapeResult[]>

// Filter pipeline
export function passesFilter(ch: YouTubeScrapeResult, opts: FilterOptions): boolean

// Save to database
export async function saveToDatabase(results, jobId, filterOpts)

// Main orchestrator
export async function runYouTubeScrape(jobId, config, progressCallback)
```

**Filter Thresholds (defaults):**

| Filter | Default | Description |
|--------|---------|-------------|
| `minSubscribers` | 5,000 | Minimum subscriber count |
| `maxSubscribers` | 5,000,000 | Maximum subscriber count |
| `minAvgViews` | 1,000 | Minimum average views per video |
| `minEngagement` | 1.0% | Minimum engagement rate |
| `excludeCountries` | [] | Countries to exclude |

**Tier Classification:**

| Tier | Subscribers |
|------|-------------|
| nano | < 10,000 |
| micro | 10,000 - 100,000 |
| mid | 100,000 - 500,000 |
| macro | 500,000 - 5,000,000 |
| mega | > 5,000,000 |

**Quota Management:**

YouTube Data API v3 daily quota: **10,000 units**

| Operation | Quota Cost |
|-----------|------------|
| search.list | 100 units |
| channels.list | 1 unit |
| videos.list | 1 unit |
| playlistItems.list | 1 unit |

---

## Database Schema

### Scraper Pipeline Tables

```sql
-- Scrape Jobs (Instagram + YouTube)
CREATE TABLE cp_scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_handle TEXT NOT NULL,
  depth INTEGER DEFAULT 2,
  max_profiles INTEGER DEFAULT 5000,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','running','paused','completed','failed','cancelled'
  )),
  progress INTEGER DEFAULT 0,
  profiles_found INTEGER DEFAULT 0,
  profiles_passed INTEGER DEFAULT 0,
  profiles_failed INTEGER DEFAULT 0,
  checkpoint JSONB,  -- { platform: 'youtube', mode: 'keyword_videos', filter: {...} }
  can_resume BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Raw Creators (all scraped profiles)
CREATE TABLE cp_raw_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  avg_views NUMERIC(12,2) DEFAULT 0,
  avg_likes NUMERIC(12,2) DEFAULT 0,
  avg_comments NUMERIC(12,2) DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  email TEXT,
  phone TEXT,
  website TEXT,
  category TEXT,
  source TEXT DEFAULT 'scraper',  -- 'scraper', 'youtube_api', 'csv_import'
  source_job_id UUID REFERENCES cp_scrape_jobs(id),
  status TEXT DEFAULT 'raw' CHECK (status IN ('raw','filtered','rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Filtered Creators (passed filters)
CREATE TABLE cp_filtered_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_creator_id UUID REFERENCES cp_raw_creators(id),
  handle TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  email TEXT,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  avg_views NUMERIC(12,2) DEFAULT 0,
  avg_likes NUMERIC(12,2) DEFAULT 0,
  avg_comments NUMERIC(12,2) DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  views_to_followers_ratio NUMERIC(8,4) DEFAULT 0,
  category TEXT,
  tier TEXT CHECK (tier IN ('nano','micro','mid','macro','mega')),
  score_breakdown JSONB,
  score_passed BOOLEAN DEFAULT false,
  outreach_status TEXT DEFAULT 'not_contacted',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Session Cookies (Instagram only)
CREATE TABLE cp_session_cookies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT,
  session_id TEXT NOT NULL,
  ds_user_id TEXT NOT NULL,
  csrftoken TEXT,
  label TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','disabled')),
  requests_count INTEGER DEFAULT 0,
  consecutive_errors INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Creator Pool (CRM) Table

```sql
CREATE TABLE cp_creator_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  youtube_url TEXT,
  youtube_handle TEXT,
  youtube_channel_id TEXT,
  instagram_url TEXT,
  instagram_handle TEXT,
  tiktok_url TEXT,
  twitter_url TEXT,
  niche TEXT[] DEFAULT '{}',
  sub_niche TEXT[] DEFAULT '{}',
  content_type TEXT[] DEFAULT '{}',
  subscribers INTEGER DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  avg_engagement NUMERIC(8,4) DEFAULT 0,
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  country TEXT,
  city TEXT,
  tier TEXT DEFAULT 'micro',
  brand_safety TEXT DEFAULT 'safe',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'active',
  rate_card JSONB DEFAULT '{}',
  internal_rate NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Reference

### Instagram Scraper API

```
GET  /api/scraper?action=stats          → Dashboard stats
GET  /api/scraper?action=jobs           → List scrape jobs
GET  /api/scraper?action=results        → Raw scraped profiles
GET  /api/scraper?action=filtered       → Filtered creators
GET  /api/scraper?action=cookies        → Session cookies
GET  /api/scraper?action=worker         → Worker status

POST /api/scraper                       → Create new scrape job
  Body: { seed_handle, depth, max_profiles }

POST /api/scraper                       → Add session cookie
  Body: { action: 'add_cookie', username, session_id, ds_user_id, csrftoken }

POST /api/scraper                       → Pause/Resume worker
  Body: { action: 'pause_worker' | 'resume_worker', jobId }

DELETE /api/scraper                     → Delete cookie
  Body: { action: 'delete_cookie', cookieId }
```

### YouTube Scraper API

```
GET  /api/scraper/youtube?action=stats    → YouTube stats
GET  /api/scraper/youtube?action=jobs     → YouTube scrape jobs
GET  /api/scraper/youtube?action=results  → YouTube raw results
GET  /api/scraper/youtube?action=filtered → YouTube filtered results

POST /api/scraper/youtube                 → Create YouTube scrape job
  Body: {
    keyword: string,           // Search keyword or seed channel
    mode: 'keyword_channels' | 'keyword_videos' | 'channel_crawl',
    maxChannels?: number,      // Max channels (default 200, max 1000)
    regionCode?: string,       // Region code (default 'IN')
    filter?: {
      minSubscribers?: number,
      maxSubscribers?: number,
      minAvgViews?: number,
      minEngagement?: number,
      excludeCountries?: string[],
    },
    autoStart?: boolean        // Start immediately (default true)
  }
```

### Bridge API

```
POST /api/outreach/creators/bridge       → Push creators to outreach
  Body: {
    source: 'scraper' | 'crm' | 'both',
    limit?: number              // Max to push (default 500)
  }
```

---

## Configuration

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key

# Instagram Scraper
INSTAGRAM_USERNAME=your_ig_username
INSTAGRAM_PASSWORD=your_ig_password

# LLM (for reply classification)
OPENAI_API_KEY=your-openai-key

# Email (for outreach)
 SES_AWS_ACCESS_KEY_ID=your-ses-key
 SES_AWS_SECRET_ACCESS_KEY=your-ses-secret
 SES_AWS_REGION=us-east-1
```

### Rate Limiting Configuration

```typescript
// src/lib/scraper.ts
const RATE_LIMITS = {
  minDelay: 1500,      // Minimum delay between requests (ms)
  maxDelay: 4000,      // Maximum delay between requests (ms)
  maxPerMinute: 30,    // Max requests per minute
  maxPerHour: 200,     // Max requests per hour
}

// Circuit breaker
const CIRCUIT_BREAKER = {
  failureThreshold: 3,      // Consecutive failures to trip
  errorRateThreshold: 0.3,  // 30% error rate to trip
  resetTimeout: 60000,      // 1 minute before retry
}
```

---

## Deployment Guide

### Prerequisites

1. **Node.js** 18+ and npm
2. **Python** 3.8+ (for Instagram scraper)
3. **Supabase** project with PostgreSQL
4. **YouTube Data API v3** key (for YouTube scraper)
5. **Instagram account** with session cookies (for Instagram scraper)

### Step 1: Install Dependencies

```bash
# Main dependencies
npm install

# Python dependencies (Instagram scraper)
pip install instaloader requests

# Puppeteer dependencies (optional, for browser-based scraping)
npm install --prefix . -p package-scraper.json
```

### Step 2: Run Database Migrations

```bash
# Run all migrations
node scripts/run-migration.js

# Or run individually:
psql -f schema/013_creator_pool.sql
psql -f schema/017_scraper_pipeline.sql
psql -f schema/018_outreach_system.sql
psql -f schema/020_outreach_campaigns.sql
```

### Step 3: Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### Step 4: Start the Application

```bash
npm run dev
```

### Step 5: Access the Scraper

- **Dashboard:** http://localhost:3000/scraper
- **Instagram Jobs:** http://localhost:3000/scraper/new
- **YouTube Scraper:** http://localhost:3000/scraper/youtube
- **Results:** http://localhost:3000/scraper/results
- **Filtered:** http://localhost:3000/scraper/filtered

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `YOUTUBE_API_KEY not configured` | Env var missing | Add key to `.env` |
| `YouTube API 403` | Quota exhausted | Wait 24h or add more API keys |
| `Instagram login failed` | Invalid credentials | Update session cookies |
| `Circuit breaker tripped` | Too many failures | Wait 1 min or reset manually |
| `No profiles found` | Filters too strict | Lower minSubscribers/minAvgViews |

### Instagram Cookie Management

1. Log into Instagram in a browser
2. Open DevTools → Application → Cookies
3. Copy `sessionid`, `ds_user_id`, and `csrftoken`
4. Add via `/scraper/cookies` page or API

### YouTube Quota Management

- Free tier: 10,000 units/day
- Each search: ~100 units
- Each channel fetch: ~1 unit
- **Tip:** Use `api_keys` table for key rotation

### Resetting the Circuit Breaker

```bash
curl -X POST http://localhost:3000/api/scraper \
  -H "Content-Type: application/json" \
  -d '{"action": "reset_circuit_breaker"}'
```

---

## File Reference

### Core Files (copy these for sharing)

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/scraper.ts` | 476 | Instagram GraphQL scraper |
| `src/lib/scraper-worker.ts` | 486 | Node.js worker manager |
| `src/lib/youtube-scraper.ts` | 380 | YouTube Data API scraper |
| `src/lib/youtube.ts` | 304 | YouTube search + details |
| `src/lib/youtube-api.ts` | 217 | YouTube channel/video fetch |
| `scraper_worker.py` | 588 | Python Instagram scraper |
| `scraper-robust.js` | 704 | Puppeteer Instagram scraper |
| `src/app/api/scraper/route.ts` | 213 | Instagram scraper API |
| `src/app/api/scraper/youtube/route.ts` | 180 | YouTube scraper API |
| `src/app/api/outreach/creators/bridge/route.ts` | 120 | Bridge to outreach |
| `schema/017_scraper_pipeline.sql` | 154 | Scraper DB schema |
| `schema/013_creator_pool.sql` | 169 | Creator pool schema |

**Total:** ~3,700 lines of production code

---

*Built by TheBoredMonkey • https://github.com/TheBoredManagement*
