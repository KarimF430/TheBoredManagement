# Scraper Codebase Package

> Complete creator scraper system — Instagram + YouTube
> Ready to drop into any Next.js + Supabase project

## What's Included

```
scraper-package/
├── src/
│   ├── lib/
│   │   ├── scraper.ts              # Instagram GraphQL scraper (476 lines)
│   │   ├── scraper-worker.ts       # Node.js worker manager (486 lines)
│   │   ├── youtube-scraper.ts      # YouTube Data API scraper (380 lines)
│   │   ├── youtube.ts              # YouTube search + video details (304 lines)
│   │   ├── youtube-api.ts          # YouTube channel/video fetch (217 lines)
│   │   ├── youtube-oauth.ts        # YouTube OAuth (296 lines)
│   │   ├── cp-db.ts                # Supabase client (137 lines)
│   │   └── discovery.ts            # Creator scoring (117 lines)
│   │
│   ├── app/api/scraper/
│   │   ├── route.ts                # Instagram scraper API (213 lines)
│   │   └── youtube/route.ts        # YouTube scraper API (180 lines)
│   │
│   ├── app/api/outreach/creators/bridge/
│   │   └── route.ts                # Scraper → Outreach bridge (120 lines)
│   │
│   └── app/scraper/                # UI pages (7 pages)
│       ├── page.tsx                # Dashboard
│       ├── new/page.tsx            # New Instagram job
│       ├── jobs/page.tsx           # Job list
│       ├── results/page.tsx        # Raw results
│       ├── filtered/page.tsx       # Filtered creators
│       ├── cookies/page.tsx        # Cookie management
│       ├── workers/page.tsx        # Worker monitor
│       └── youtube/page.tsx        # YouTube scraper UI
│
├── schema/
│   ├── 013_creator_pool.sql        # Creator pool (CRM)
│   ├── 017_scraper_pipeline.sql    # Scraper tables
│   ├── 018_outreach_system.sql     # Outreach tables
│   └── 020_outreach_campaigns.sql  # Campaigns
│
├── scraper_worker.py               # Python Instagram scraper (588 lines)
├── scraper-robust.js               # Puppeteer scraper (704 lines)
├── package-scraper.json            # Puppeteer dependencies
└── docs/SCRAPER_CODEBASE.md        # Full documentation
```

**Total: ~3,700 lines of production code**

## Quick Start

### 1. Copy files into your project

```bash
# Copy src/ files
cp -r src/lib/scraper* your-project/src/lib/
cp -r src/lib/youtube* your-project/src/lib/
cp -r src/app/api/scraper your-project/src/app/api/
cp -r src/app/scraper your-project/src/app/
cp -r src/components your-project/src/

# Copy schema
cp schema/*.sql your-project/schema/

# Copy Python/JS scrapers
cp scraper_worker.py your-project/
cp scraper-robust.js your-project/
```

### 2. Run database migrations

```bash
psql -f schema/013_creator_pool.sql
psql -f schema/017_scraper_pipeline.sql
psql -f schema/018_outreach_system.sql
psql -f schema/020_outreach_campaigns.sql
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Install dependencies

```bash
# Node.js
npm install @supabase/supabase-js

# Python (Instagram scraper)
pip install instaloader requests

# Optional: Puppeteer scraper
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### 5. Run

```bash
npm run dev
```

Access at: `http://localhost:3000/scraper`

## Features

### Instagram Scraper
- GraphQL API scraping with session cookies
- 3 implementations: TypeScript, Python, Puppeteer
- Round-robin cookie rotation
- Rate limiting + circuit breaker
- Checkpoint/resume support
- 2-pass filter (profile + content)

### YouTube Scraper
- YouTube Data API v3 integration
- 3 search modes: keyword channels, keyword videos, channel crawl
- Auto-fetches subscriber counts, avg views, engagement
- Configurable filter thresholds
- Quota management with key rotation

### Outreach Bridge
- Push scraped creators to email outreach pipeline
- Deduplication by email
- Maps tiers and preserves raw signals

## Requirements

- Node.js 18+
- Supabase project (PostgreSQL)
- YouTube Data API key (for YouTube scraper)
- Instagram session cookies (for Instagram scraper)

## Documentation

See `docs/SCRAPER_CODEBASE.md` for complete architecture, API reference, and troubleshooting guide.
