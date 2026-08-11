# SOV Panel — Complete System Documentation

**Project:** YouTube Share-of-Voice (SOV) Dashboard  
**Repository:** `sov-dashboard/`  
**Built by:** TheBoredMonkey  
**Platform:** Next.js 16 + Supabase + BullMQ + YouTube Data API  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Dependencies](#3-tech-stack--dependencies)
4. [Database Schema & Data Layer](#4-database-schema--data-layer)
5. [Codebase Structure](#5-codebase-structure)
6. [Frontend — Pages & Features](#6-frontend--pages--features)
7. [Frontend — Component Architecture](#7-frontend--component-architecture)
8. [API Routes Layer](#8-api-routes-layer)
9. [Background Workers & Job Queue](#9-background-workers--job-queue)
10. [YouTube Data Ingestion Pipeline](#10-youtube-data-ingestion-pipeline)
11. [AI & Transcript Pipeline](#11-ai--transcript-pipeline)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Security Architecture](#13-security-architecture)
14. [Caching Strategy](#14-caching-strategy)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Configuration & Environment Variables](#16-configuration--environment-variables)
17. [Open Questions & Design Decisions](#17-open-questions--design-decisions)

---

## 1. Project Overview

The **SOV Panel** is an enterprise-grade YouTube competitive intelligence dashboard that tracks **Share-of-Voice (SOV)** across brands, keywords, and content categories. It enables marketing teams to:

- **Track keyword rankings** across YouTube search results (long-form + Shorts) for 50+ keywords
- **Monitor daily view counts** for 500+ videos with growth analytics
- **Analyze brand share-of-voice** — what percentage of audience attention each competitor commands
- **Detect brand mentions** in video transcripts via AI (GPT-4o-mini via OpenRouter)
- **Identify creators and partnership opportunities** via channel analytics
- **Track dropped rankings** and multi-keyword ranking videos
- **Regional language analytics** across 10 Indian language markets

The system is currently operating in the **Water Purifier market** (Aquaguard, KENT RO, Livpure, Pureit, AO Smith) as a reference campaign, but is designed for multi-campaign, multi-category use.

---

## 2. System Architecture

The system follows a **decoupled, event-driven** architecture with four primary layers:

```
┌─────────────────────────────────────────────────────┐
│                   ┌───────────────────┐             │
│   User ─────────► │  React Dashboard  │ ◄─────────  │
│   (Browser)       │  (Next.js 16)     │   Auth JWT  │
│                   └────────┬──────────┘             │
│                            │ REST API                │
│                   ┌────────▼──────────┐             │
│                   │  Next.js API      │             │
│                   │  (App Router)     │             │
│                   └────────┬──────────┘             │
│                            │                        │
│         ┌──────────────────┼──────────────────┐     │
│         │                  │                  │     │
│  ┌──────▼──────┐   ┌──────▼──────┐   ┌───────▼────┐│
│  │  Supabase   │   │   Redis     │   │  YouTube   ││
│  │ PostgreSQL  │   │  (Upstash)  │   │  Data API  ││
│  └──────┬──────┘   └──────┬──────┘   └───────┬────┘│
│         │                 │                   │     │
│  ┌──────▼──────┐   ┌──────▼──────┐           │     │
│  │  BullMQ     │   │  Caching    │           │     │
│  │  Workers    │   │  (L1/L2)    │           │     │
│  └─────────────┘   └─────────────┘           │     │
│                                              │     │
│  ┌────────────────────────────────────────────┘     │
│  │  n8n Workflows (External Orchestration)         │
│  └─────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **n8n workflows** ingest YouTube data via API key rotation (10 accounts) → upsert into Supabase
2. **BullMQ workers** (Node.js) handle daily view refreshes, weekly rescrapes, brand analysis
3. **Next.js API routes** compute analytics at query time via Supabase RPCs + materialized views
4. **React frontend** consumes JSON REST responses, renders using Recharts/ECharts
5. **Redis** provides L2 caching + BullMQ job queue backend

---

## 3. Tech Stack & Dependencies

### Core Framework
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.10 | App Router, API routes, SSR/SSG |
| React | 19.2.4 | UI rendering |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |

### Database & Storage
| Technology | Purpose |
|---|---|
| Supabase (PostgreSQL) | Primary database with RPCs, materialized views |
| better-sqlite3 | Local development/legacy SQLite backend |
| Redis (Upstash) | BullMQ job queue + L2 cache |
| TimescaleDB | Time-series for view_snapshots (hypertable) |

### State & Data Fetching
| Library | Purpose |
|---|---|
| @tanstack/react-query | Server state management, caching |
| zustand | Client-side global state (campaigns) |
| jose | JWT signing/verification |

### Charts & Visualization
| Library | Purpose |
|---|---|
| recharts | Area, Bar, Pie, Scatter, Radar charts |
| echarts + echarts-for-react | Heatmaps, advanced charts |
| framer-motion | Animations |

### Background Jobs
| Library | Purpose |
|---|---|
| bullmq | Job queue processing |
| ioredis | Redis client |
| googleapis | YouTube Data API client |

### AI & ML
| Library | Purpose |
|---|---|
| openai | OpenRouter API client (GPT-4o-mini for brand analysis) |
| @google/generative-ai | Gemini (used in n8n WF5 pipeline only, not main app) |
| youtube-transcript | Caption fetching |
| ahocorasick | Aho-Corasick string matching for brand detection |

### Auth & Security
| Library | Purpose |
|---|---|
| jose | JWT tokens |
| node:crypto | Password hashing (scrypt) |

### UI Components
| Library | Purpose |
|---|---|
| lucide-react | Icons |
| class-variance-authority | Variant management |
| clsx + tailwind-merge | Class utilities |
| next-themes | Theme support |
| date-fns | Date formatting |

---

## 4. Database Schema & Data Layer

### 4.1 Entity Relationship

```
campaigns ──┬── keywords ──┬── keyword_videos ──▶ videos
             │              ├── keyword_shorts ──▶ videos
             │              └── keyword_rank_history
             │
             ├── campaign_brands
             ├── tracked_videos ──▶ videos
             └── share_links

videos ──┬── view_snapshots (TimescaleDB hypertable)
          ├── video_transcripts
          ├── brand_mentions / brand_analysis
          ├── video_phrase_summary
          └── brand_tags

system_metadata (key-value store)
api_keys (YouTube API key rotation)
scrape_jobs (job tracking)
users (auth)
alert_rules (threshold alerts)
sov_snapshots (brand SOV time-series)
insight_snapshots (AI-generated weekly summaries)
```

### 4.2 Core Tables (25 tables)

| Table | Key Columns | Purpose |
|---|---|---|
| `campaigns` | id, name, category, sub_category, status | Campaign container |
| `campaign_brands` | campaign_id, name, type (own/competitor) | Brand configuration |
| `keywords` | id, text, campaign_id, category, language, status | Tracked search terms |
| `videos` | id, youtube_id, title, channel_name, tags[], duration_sec, is_deleted | YouTube video metadata |
| `keyword_videos` | keyword_id, video_id, campaign_id, rank, search_appearance_count, keywords_appeared[], cross_keyword_ranks[], is_our_video | Long-form ranking |
| `keyword_shorts` | Same structure as keyword_videos | Shorts ranking |
| `view_snapshots` | video_id, campaign_id, view_count, like_count, comment_count, daily_delta, growth_percent, snapshot_date | Daily metrics history |
| `brand_tags` | video_id, brand_name, campaign_id | Manual brand tagging |
| `brand_mentions` | video_id, brand_name, mention_count, mention_context[] | AI-detected mentions |
| `brand_analysis` | id, video_id, brand_name, confidence, mention_type, context_quotes[] | AI brand detection |
| `video_transcripts` | video_id, youtube_id, transcript_text, language, fetch_status | Caption storage |
| `scrape_jobs` | id, keyword_id, status, results_count, error_msg, api_key_used, quota_used | Job tracking |
| `api_keys` | id, label, api_key (encrypted), bucket, units_used, units_limit | YouTube key rotation |
| `system_metadata` | key, value, updated_at | Key-value config store |
| `sov_snapshots` | campaign_id, brand_name, snapshot_date, sov_percent, total_views, brand_views, metric_type | SOV time-series |
| `users` | id, email, password_hash, role (admin/brand), campaign_id, brand_name | Authentication |
| `keyword_rank_history` | keyword_id, video_id, rank, form_type (long/short), week_start | Historical rankings |
| `alert_rules` | campaign_id, brand_name, metric, threshold, direction, webhook_url | Configurable alerts |
| `share_links` | id, token, campaign_id, snapshot_data (JSONB), expires_at | Public share snapshots |
| `insight_snapshots` | campaign_id, week_ending, summary_text, key_metrics (JSONB) | AI weekly summaries |
| `video_phrase_summary` | video_id, extracted_phrases[], keyword_count | Multi-keyword phrase extraction |
| `tracked_videos` | video_id, campaign_id, added_at | Manually tracked videos |
| `campaign_videos` | campaign_id, video_id, first_seen_at | Campaign video association |
| `quota_usage` | account_name, date, units_used | Daily quota tracking |
| `_migrations` | name, applied_at | Migration tracking |

### 4.3 Materialized Views (3 views)

| View | Refresh Strategy | Purpose |
|---|---|---|
| `brand_sov_mv` | Concurrent | Pre-computed brand viewership SOV |
| `brand_freq_sov_mv` | Concurrent | Pre-computed brand frequency SOV |
| `channel_rank_mv` | Concurrent | Most ranking channels by frequency |

### 4.4 Database RPC Functions

The `supabase.ts` layer provides a custom `exec_sql` RPC wrapper that:
- Wraps SELECT queries in `json_agg(row_to_json(...))` for structured responses
- Handles CTEs, DML with RETURNING clauses
- Supports parameterized queries via dollar-notation (`$1`, `$2`) with custom inlining
- Batch operations: `batchUpsert`, `batchUpsertReturning`, `batchUpdate`, `batchInsertFromArray`

---

## 5. Codebase Structure

```
sov-dashboard/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (Providers, AppShell)
│   │   ├── page.tsx                  # Main dashboard page (9 tabs)
│   │   ├── globals.css               # Design system (glassmorphic)
│   │   ├── middleware.ts             # Auth middleware (JWT cookie check)
│   │   ├── api/                      # 23+ API route groups
│   │   ├── login/                    # Login page
│   │   ├── client/                   # Brand-limited client dashboard
│   │   ├── brands/                   # All brands overview (Page 6)
│   │   ├── brand-growth/             # Brand growth leaderboard (Page 3)
│   │   ├── leaderboard/              # Top videos leaderboard (Page 2)
│   │   ├── keyword-sov/              # Category keyword SOV (Page 5)
│   │   ├── sov-trend/                # Brand SOV trend graph (Page 4)
│   │   ├── videos/                   # Video directory
│   │   ├── video/                    # Single video detail
│   │   ├── channel/                  # Single channel detail
│   │   ├── dropped/                  # Dropped rankings (Page 8)
│   │   ├── multi-keyword/            # Multi-keyword videos (Page 9)
│   │   ├── control/                  # Campaign management console
│   │   ├── pending-tagging/          # Untagged videos tagging UI
│   │   ├── analytic-calendar/        # Calendar view of analytics
│   │   └── privacy-policy/           # Legal page
│   │
│   ├── components/                   # Shared components
│   │   ├── AppShell.tsx              # Shell wrapper (sidebar + header + content)
│   │   ├── Sidebar.tsx               # Admin sidebar navigation
│   │   ├── ClientSidebar.tsx         # Brand-client sidebar
│   │   ├── Header.tsx                # Top bar (campaign selector, user info)
│   │   ├── IndiaMap.tsx              # Interactive India regional map (SVG)
│   │   ├── Providers.tsx             # React Query + Theme providers
│   │   ├── PreWarm.tsx               # SSR data preloading
│   │   ├── TutorialOverlay.tsx       # First-time user tutorial
│   │   ├── PageSkeleton.tsx          # Loading skeletons
│   │   └── tabs/                     # Per-tab components
│   │       ├── VideosTab.tsx
│   │       ├── KeywordsTab.tsx
│   │       ├── TrendsTab.tsx
│   │       ├── GrowthTab.tsx
│   │       ├── AlertsTab.tsx
│   │       └── SettingsTab.tsx
│   │
│   ├── lib/                          # Business logic & utilities
│   │   ├── supabase.ts               # Supabase client + query helpers (958 lines)
│   │   ├── queries.ts                # All analytical queries (526 lines)
│   │   ├── auth.ts                   # JWT + password hashing
│   │   ├── store.ts                  # Zustand campaign store
│   │   ├── queue.ts                  # BullMQ queue definitions
│   │   ├── worker.ts                 # Background job processors
│   │   ├── worker-startup.ts         # Worker singleton initializer
│   │   ├── scrape-pipeline.ts        # SQLite scrape logic (668 lines)
│   │   ├── scrape-pipeline-pg.ts     # PostgreSQL scrape logic (979 lines)
│   │   ├── youtube.ts                # YouTube API client (API keys)
│   │   ├── youtube-oauth.ts          # YouTube API client (OAuth 2.0)
│   │   ├── brand-analyzer.ts         # AI brand mention detection (265 lines)
│   │   ├── transcript.ts             # 3-strategy transcript fetcher
│   │   ├── quota-monitor.ts          # YouTube quota management
│   │   ├── crypto.ts                 # AES-256 encryption for API keys
│   │   ├── cache.ts                  # 3-tier caching (L1/L2/L3)
│   │   ├── google-sheets.ts          # Data export to Google Sheets
│   │   ├── migrations.ts             # DB migration runner
│   │   ├── db.ts                     # SQLite client (legacy)
│   │   ├── queryClient.ts            # React Query client config
│   │   ├── brand-colors.ts           # Deterministic brand color hashing
│   │   ├── categories.ts             # Product category taxonomy
│   │   ├── india-regions.ts          # 10 Indian language regions
│   │   └── brand-analyzer.test.ts    # Tests for brand analyzer
│   │
│   └── middleware.ts                 # Route protection + role-based redirect
│
├── schema/                           # SQL migration files
│   ├── 001_base_extensions.sql
│   ├── 002_new_tables_and_timescale.sql
│   ├── 003_indexes_and_materialized_views.sql
│   ├── 004_performance_indexes.sql
│   ├── FULL_MIGRATION.sql
│   └── *.sql (fix scripts)
│
├── data/                             # SQLite database files (dev)
├── scripts/
│   └── run-migration.js
├── public/                           # Static assets
├── next.config.ts
├── vercel.json                       # Deployment + cron config
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## 6. Frontend — Pages & Features

### 6.1 Main Dashboard (`/` — `page.tsx`)

This is the **central analytics hub** — a single-page app with 9 tabbed panes and a slide-in detail drawer. It features live/demo mode toggle, responsive grids, and interactive cross-filtering.

**Tab: Overview** (default landing)
- 11 metric cards: Keywords Tracked, Total Videos (clickable → `/videos`), Unique Videos, Total Viewership (Indian numeral format), Top Keyword Type, Views Growth (24h/7d/30d toggle), New Videos (7d), Pending Tagging (clickable → `/pending-tagging`), Active Creators, Top Creator, Our Videos
- Interactive India regional map (SVG) with hover tooltips showing per-language SOV
- Regional Language Leaderboard sidebar
- Views Tracker: Area/Bar chart with Cumulative/Daily Gain toggle, time range filters (24h/48h/1W/1M/All/Custom), format filter (All/Long/Shorts)
- Brand SOV summary bar (top 4 brands with % bars)
- Top Performing Creators summary (top 4)
- Top Ranked Videos summary (top 4)

**Tab: Brand SOV**
- View SOV Leader + Frequency SOV Leader banners
- Pie chart: View share of voice (language + format filters, inner ring with top SOV %)
- Pie chart: Keyword frequency SOV
- Scatter chart: Brand positioning map (View SOV × Freq SOV, bubble = video count)
- Horizontal bar chart: Brand efficiency score (views per keyword appearance)
- View More drawer with full brand breakdown

**Tab: Creators** (Partnership Intelligence)
- 5 KPI cards: Total Creators, Premium Creators (>150K avg views), Avg Partnership ROI, Multi-Brand Creators, Shorts Specialists
- Partnership Score Matrix (composite bar: View Reach + Efficiency + Keyword Coverage + Brand Diversity)
- Creator-Brand Fit Radar (5 dimensions)
- Creator Leaderboard (full table with rank, name, views, videos, avg views, keywords, brand count, shorts %, best rank)

**Tab: Rankings**
- Rank Distribution (bar chart by rank bucket #1, #2-3, #4-5, #6-10, #11-15, #16-20)
- Ranking Type Compare (Top 1/3/5/10 — long vs short)
- Views vs Rank Scatter Plot (bubble = keyword count)
- Filters: Long/Short toggle, brand filter, rank range filter
- Video table with search

**Tab: Videos** — Delegated to `VideosTab` component
**Tab: Keywords** — Delegated to `KeywordsTab` component
**Tab: Trends** — Delegated to `TrendsTab` component
**Tab: Growth** — Delegated to `GrowthTab` component
**Tab: Alerts** — Delegated to `AlertsTab` component
**Tab: Settings** — Delegated to `SettingsTab` component

**Key frontend patterns in the main page:**
- ~3400 lines of inline JSX with inline `style` objects (no Tailwind classes used in this file)
- All state managed via `useState` + `useMemo` for derived analytics
- `useQuery` from React Query for dashboard data fetching
- Demo mode (Water Purifier data) toggleable for empty-state presentation
- CSV export for all tables
- Detail drawer overlay (slide-in panel) for views/Brand SOV/creator/rank drill-downs
- Format and language filters per widget (not global)

### 6.2 Detailed Pages

| Page | Route | Key Features |
|---|---|---|
| **Login** | `/login` | Email/password form, JWT session cookie |
| **Client Dashboard** | `/client` | Brand-restricted view — shows only brand's data |
| **All Brands** | `/brands` | Pie charts (view + frequency SOV), clickable brand list → brand detail |
| **Brand Growth** | `/brand-growth` | Toggle: views/frequency growth, time filter 24h/7d/30d, table with % growth + rank movement |
| **Keyword SOV** | `/keyword-sov` | Interactive SOV graph, filters: Language (Overall/Tamil/Telugu/Malayalam) × Keyword Type (Generic/Branded) |
| **SOV Trend** | `/sov-trend` | Brand selector dropdown, time range (Daily/Monthly/3M/6M/1Y), line graph |
| **Leaderboard** | `/leaderboard` | Top 100 videos, toggle views/frequency, paginated (20/page), thumbnail + title + channel + brand + views + freq |
| **Videos** | `/videos` | Full video directory with search and filters |
| **Video Detail** | `/video?id=...` | Single video analytics — view history, mentions, tags |
| **Channel Detail** | `/channel?name=...` | Channel performance overview |
| **Dropped Rankings** | `/dropped` | Videos that lost rank — reason (deleted/pushed_out), last seen rank/date |
| **Multi-Keyword** | `/multi-keyword` | Videos ranking on 5+/10+/15+ keywords, phrase summary extraction |
| **Control Panel** | `/control` | Campaign management: add keywords, trigger scrapes, manage brands |
| **Pending Tagging** | `/pending-tagging` | Untagged videos — inline brand tag assignment |
| **Analytic Calendar** | `/analytic-calendar` | Calendar-view analytics heatmap |
| **Privacy Policy** | `/privacy-policy` | Legal page |

### 6.3 UI/UX Design System

The design system (defined in `globals.css`) follows a **glassmorphic, bright, graphic aesthetic**:

- **Fonts:** Plus Jakarta Sans (headings), JetBrains Mono (data/metrics)
- **Color Palette:** Google Blue `#1A73E8`, Emerald `#00C853`, Orange `#FF6D00`, Violet `#7C3AED`, Red `#FF2D55`
- **Layout:** Fixed sidebar (220px expanded / 58px collapsed), header (54px)
- **Surfaces:** White cards with subtle borders (`#F1F5F9`), rounded corners (12-14px), minimal shadow
- **Sidebar:** Glassmorphic effect with backdrop blur, gradient accent line, navigation with active state indicators
- **Animations:** `fadeUp` for tab panes, `slideIn` for detail drawer, `spin` for loading states
- **Responsiveness:** Flexbox/grid layouts with `auto-fit` columns, horizontal scroll for tabs on overflow

---

## 7. Frontend — Component Architecture

### 7.1 Layout Components

**AppShell** — Wraps all pages in:
- Admin route: Sidebar (left) + Header (top) + main content area
- Client route: ClientSidebar (left) + Header (top) + main content

**Sidebar** — Navigation with sections:
- Dashboard (campaign analytics links)
- Intelligence (brands, keyword SOV, trend, growth)
- Content (videos, leaderboard, channels, creators)
- Operations (control panel, pending tagging, alerts, settings)
- Campaign selector at top

**ClientSidebar** — Simplified navigation for brand users:
- Only brand-relevant links
- Campaign filtered to user's brand

**Header** — Contains:
- Campaign selector dropdown (admin only)
- Last updated timestamps (views + ranking — two separate fields)
- Quick action buttons (refresh, add keyword)

**Providers** — Wraps app in:
- React Query `QueryClientProvider`
- Next-themes `ThemeProvider`

**PreWarm** — SSR optimization that triggers data fetching before hydration

### 7.2 Tab Components

| Component | Purpose |
|---|---|
| `VideosTab` | Video library with search, sort, filters |
| `KeywordsTab` | Keyword management — list, add, remove |
| `TrendsTab` | Trend analysis charts |
| `GrowthTab` | Growth rate visualizations |
| `AlertsTab` | Alert rule configuration UI |
| `SettingsTab` | Campaign settings, API key management |

### 7.3 Specialized Components

**IndiaMap** — Interactive SVG map of India with:
- 10 language region overlays
- Hover tooltip showing per-region SOV metrics
- Color-coded activity state
- Coordinates mapping for each region's center point

**TutorialOverlay** — First-time user onboarding:
- Step-by-step walkthrough
- Highlights key dashboard features
- Dismissable overlay

**PageSkeleton** — Loading state:
- Shimmer animation
- Matches layout structure

---

## 8. API Routes Layer

23+ API route groups under `src/app/api/`:

### Data Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/dashboard` | GET | Full dashboard data (campaign_id, ownership filter) |
| `/api/dashboard/kpis` | GET | KPI metric cards data |
| `/api/overview` | GET | Page 1 overview data |
| `/api/brands` | GET/POST/DELETE | Brand management (CRUD) |
| `/api/brands/analyze` | POST | Trigger AI brand analysis |
| `/api/keywords` | GET/POST/DELETE | Keyword management |
| `/api/video` | GET | Single video detail |
| `/api/videos` | GET | Video directory |
| `/api/channel` | GET | Channel detail |
| `/api/campaigns` | GET | List/switch campaigns |
| `/api/client` | GET | Brand-restricted dashboard data |
| `/api/sov-trend` | GET | SOV trend line chart data |
| `/api/alerts` | GET/POST | Alert rules |
| `/api/analytic-calendar` | GET | Calendar data |

### System Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/scrape` | POST/GET | Queue keyword scraping + status |
| `/api/quota` | GET | YouTube quota status + alerts |
| `/api/cron?job=daily_views` | POST | Cron-triggered daily views |
| `/api/cron?job=weekly_refresh` | POST | Cron-triggered weekly rescrape |
| `/api/auth/youtube` | GET | Initiate YouTube OAuth |
| `/api/auth/youtube/callback` | GET | OAuth callback handler |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/init` | GET | System initialization (migrations + workers) |
| `/api/warm` | GET | Server warm-up (daily cron) |
| `/api/api-keys` | GET/POST | YouTube API key management |
| `/api/sync` | POST | Trigger Google Sheets sync |
| `/api/setup` | GET/POST | Initial app setup |
| `/api/users` | GET/POST | User management (admin only) |
| `/api/debug` | GET | Debug/health endpoints |

### Key API Design Patterns

- **Campaign ID** passed as query parameter (`campaign_id=...`) — not yet JWT-embedded for multi-campaign
- **Ownership filter** via query parameter (`is_ours=true/false`)
- **Server caching** with `revalidate=60` (60s CDN cache)
- **Share token** support for public snapshot links
- **Error handling:** Returns `{error: string}` with appropriate HTTP status codes
- **Auth:** Protected by middleware JWT check; some routes use `CRON_SECRET` header for cron jobs

---

## 9. Background Workers & Job Queue

### 9.1 BullMQ Queue Definitions

| Queue Name | Concurrency | Purpose |
|---|---|---|
| `KEYWORD_SCRAPE` | 2 workers | Individual keyword YouTube scraping |
| `DAILY_VIEWS` | 1 worker | Daily view count refresh for all videos |
| `WEEKLY_REFRESH` | 1 worker | Weekly keyword re-scraping |
| `BRAND_ANALYSIS` | 1 worker | AI brand mention detection |
| `TRANSCRIPT_FETCH` | 1 worker | Transcript download |
| `QUOTA_MONITOR` | 1 worker | YouTube quota usage check |

### 9.2 Worker Processors

**`startScrapeWorker()`** — Processes a single keyword scrape:
1. Creates scrape_job record (status: running)
2. Calls YouTube search × 3 sort orders (relevance, viewCount, date)
3. Deduplicates against existing videos
4. Fetches video details
5. Upserts videos + keyword_videos + view_snapshots
6. Marks job completed

**`startDailyViewsWorker()`** — Processes batch view refresh:
1. Queries all active video IDs
2. Batches of 50 → YouTube API fetch
3. Flags deleted videos
4. Inserts view_snapshots for each
5. Calculates daily_delta and growth_percent via window functions

**`startWeeklyRefreshWorker()`** — Rescrapes all active keywords:
1. Fetches all active keywords
2. Iterates through each, calling scrapeKeyword
3. Records keyword_rank_history snapshots

**`startBrandAnalysisWorker()`** — AI analysis:
1. Selects videos needing analysis (no transcript or no analysis)
2. Fetches transcript via 3-strategy pipeline
3. Sends to OpenRouter Gemma API
4. Stores brand_analysis results

### 9.3 Scheduled Jobs

```javascript
// Daily at 8:00 AM — view count refresh
initializeScheduledJobs() => DAILY_VIEWS queue

// Weekly on Monday at 6:00 AM — keyword rescrape
initializeScheduledJobs() => WEEKLY_REFRESH queue
```

Vercel cron jobs (defined in `vercel.json`):
```json
[
  { "path": "/api/warm", "schedule": "0 7 * * *" },           // Daily 7 AM
  { "path": "/api/cron?job=daily_views", "schedule": "0 8 * * *" },  // Daily 8 AM
  { "path": "/api/cron?job=sheets_sync", "schedule": "0 9 * * *" }   // Daily 9 AM
]
```

### 9.4 Job Options
- Retries: 3 attempts with exponential backoff
- Keep completed: last 100
- Keep failed: last 50
- Rate limiting: 100 jobs/minute for scraping

---

## 10. YouTube Data Ingestion Pipeline

### 10.1 Two Pipeline Implementations

The codebase has **two parallel scraping pipelines** — a legacy SQLite version and the current PostgreSQL version:

| Aspect | SQLite (`scrape-pipeline.ts`) | PostgreSQL (`scrape-pipeline-pg.ts`) |
|---|---|---|
| Database | `better-sqlite3` | Supabase (via `queryAll`) |
| Auth | Static API keys | OAuth 2.0 + API key fallback |
| Search strategy | Single sort order | 3 sort orders (relevance, viewCount, date) |
| Dedup | After fetch | During fetch + batch check |
| Batch operations | Transactions | `batchUpsert` / `CASE`-based updates |
| Video length filter | `duration < 240s = short` | Same |

The PG pipeline is ~979 lines and is the **primary active pipeline**.

### 10.2 Three-Tier Search Strategy (PG pipeline)

1. **OAuth 2.0** (primary) — Uses `youtubeApiFetch` with automatic token refresh
2. **API Key rotation** (fallback) — `searchYouTubeViaApiKey` with round-robin key selection, quota tracking, automatic exhaustion handling
3. **Campaign Pool** (last resort) — Reuses previously scraped videos from the campaign's keyword pool

### 10.3 Quota Management

- **10 YouTube API keys** rotated round-robin via `getNextAvailableKey()`
- Atomic reservation: `UPDATE api_keys ... RETURNING *` pattern
- Quota refund on non-quota errors
- Automatic key exhaustion on 403/429 responses
- Quota monitoring: daily usage, 80% warning, 90% critical, exhaustion alerts
- API keys encrypted at rest via AES-256-CBC (`crypto.ts`)

### 10.4 Search Costs

| API Call | Quota Cost |
|---|---|
| `search.list` | 100 units |
| `videos.list` (per video) | 1 unit |
| `channels.list` | 1 unit |
| `captions.list` | 50 units |
| `captions.download` | 200 units |

### 10.5 Video Deduplication

- Dedup by `youtube_id` (11-char YouTube ID)
- Videos already in database get their `keyword_videos` mapping updated (keywords_appended + cross_keyword_ranks appended)
- Existing mapping update: `search_appearance_count` incremented, arrays appended
- Campaign-level dedup via `campaign_videos` junction table

### 10.6 n8n External Workflows (Documented in `youtube_data_flow_analysis.md`)

The system can also ingest data via **n8n** (separate deployment):
- **WF1**: Keyword intake (webhook → campaigns + keywords + scrape_jobs)
- **WF2**: Video scraping (YouTube search → dedup → upsert → keyword mapping)
- **WF3**: Daily growth tracker (view_snapshots + growth calculation via LAG window)
- **WF4**: 7-day scheduler (weekly keyword rescrape loop)
- **WF5**: Transcript + brand mentions (caption download → Gemini analysis)
- **WF6**: Snapshot pruner (90-day retention)
- **WF7**: Stuck job reaper (hourly cleanup)

---

## 11. AI & Transcript Pipeline

### 11.1 Transcript Fetching (`transcript.ts`)

Three-strategy fallback system:

| Method | Provider | Speed | Language Support | API Key Required? |
|---|---|---|---|---|
| 1. `youtube-transcript` lib | Direct | Fast | 11 Indian languages | No |
| 2. YouTube Captions API | Google | Medium | All (if captioned) | OAuth |
| 3. Groq Whisper STT | Groq | Slow | All languages | GROQ_API_KEY |

- Method 1 tries Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Odia, English
- Method 2 uses API key for `captions.list`, OAuth for `captions.download`, parses XML/SRV3
- Method 3 downloads audio via `yt-dlp` → Groq Whisper (25MB limit) → temp file cleanup
- Returns chunked text (≤8000 chars per chunk)

### 11.2 Brand Mention Detection (`brand-analyzer.ts`)

**AI Model:** `openai/gpt-4o-mini` via OpenRouter (NOT Gemma — updated from earlier design)

**Architecture:**
- Aho-Corasick exact matching (1,915 brand aliases) → ~13ms per video
- Levenshtein fuzzy matching (catches ASR errors) → prefix-indexed, max edit distance 2
- LLM full extraction with candidate brands from text search
- Post-processing: grounding check, canonicalization, dedup, recall safety nets

**Analysis scope per video:**
- Transcript text (primary, truncated to 15,000 chars)
- Title, channel name, description (truncated to 3,000 chars)
- Pinned comment (if available)
- Campaign brands (client-specific brands to prioritize)
- Candidate brands found by Aho-Corasick text search

**Prompt design:**
- Role: "TBM's senior market intelligence analyst"
- Full extraction: finds brands + classifies + explains why they matter
- JSON output: `{video_format, brand_notes[{brand_name, why_it_matters, confidence, context_quotes}]}`

**Post-processing pipeline:**
1. Grounding check — verifies brand appears in source text (prevents hallucinations)
2. Retail platform exclusion — Amazon, Flipkart, Meesho, etc. always filtered
3. Ambiguity guard — common words (AND, MAX, W) need exact brand casing
4. Canonicalization — maps to master list spelling ("boat" → "boAt")
5. Deduplication — merged by canonical name, highest confidence kept
6. Campaign brand recall — missed campaign brands recovered at 0.55 confidence
7. Gazetteer brand recall — missed exact matches recovered at 0.50 confidence

**Performance:**
- 1,000 videos: ~13s matching + LLM calls
- Cost per video: ~$0.00064
- Cost per 1,000 videos: ~$0.64

**LLM Usage Tracking (`llm-usage-monitor.ts`):**
- Every LLM call logged to `llm_usage` table
- Tracks: tokens (input/output/cached), cost (USD), latency (ms), per-video and per-campaign
- Similar to YouTube API quota monitoring (`quota-monitor.ts`)

**Fallback:** `analyzeBrandsFromMetadata()` for transcript-less videos (analyzes title + description only)

### 11.3 Gemini Integration (via `@google/generative-ai`)

- Alternative AI provider for transcript analysis
- Used in the n8n WF5 pipeline (external workflow)
- NOT used in the main Next.js brand analysis flow
- The primary brand detection uses GPT-4o-mini via OpenRouter

### 11.4 Multi-Keyword Phrase Extraction (`video_phrase_summary` table)

- Extracts common terms/phrases across titles and descriptions of multi-keyword-ranking videos
- Uses GPT-4o-mini to identify why videos rank broadly
- Results stored in `video_phrase_summary.extracted_phrases[]`

---

## 12. Authentication & Authorization

### 12.1 Auth Flow

```
Login (/api/auth/login)
  → Email + password verification (scrypt hashing)
  → JWT issued (HS256, 7-day expiry)
  → Cookie set: "sov_session"
  → Redirect to dashboard

Middleware (/middleware.ts)
  → Read sov_session cookie
  → Verify JWT
  → Check role (admin / brand)
  → Allow/redirect/401
```

### 12.2 JWT Payload Structure

```typescript
interface JWTPayload {
  id: string          // User UUID
  email: string       // User email
  role: 'admin' | 'brand'
  campaign_id?: string | null  // Brand-scoped campaign
  brand_name?: string | null   // Brand-scoped brand name
}
```

### 12.3 Role-Based Access

| Role | Access |
|---|---|
| `admin` | Full dashboard + control panel + all API routes |
| `brand` | `/client` dashboard (own brand data only), redirect from admin pages |

### 12.4 Middleware Rules (order matters)

1. Skip: `/_next`, `/favicon.ico`, `/login`, `/api/auth/*`, `/api/brands/analyze`, `/api/warm`, `/api/cron`
2. No valid token → 401 for API routes, redirect to `/login` for pages
3. Non-admin accessing admin pages → redirect to `/client`
4. Allowed routes: admin → everything, brand → `/client` and descendants

### 12.5 Password Security

- Hashing: Node.js `crypto.scryptSync` (CPU-hard, memory-hard)
- Salt: 16 random bytes, stored as `salt:hash` format
- Verification: `crypto.timingSafeEqual` (constant-time comparison)
- Dynamic `require('crypto')` to avoid edge runtime bundling issues

---

## 13. Security Architecture

### 13.1 API Key Protection
- YouTube API keys encrypted at rest using **AES-256-CBC** (`crypto.ts`)
- Encryption key derived from `API_KEY_ENCRYPTION_SECRET` env var
- Output: `iv_hex:ciphertext_hex`
- `maskApiKey()` for safe UI display (first 8 chars visible, rest masked)

### 13.2 SQL Injection Prevention
- Custom `escapeParam()` / `escapeVal()` functions for parameter inlining
- UUID validation via regex before casting
- Single-quote escaping for string values
- Array parameter handling via `ARRAY[...]` syntax

### 13.3 Rate Limiting
- `@upstash/ratelimit` for API endpoint rate limiting
- Worker-level concurrency limits (scrape=2, others=1)
- YouTube API quota management limits daily consumption

### 13.4 Additional Measures
- JWT with 7-day expiry, HS256 signing
- `CRON_SECRET` for external cron-triggered endpoints
- `is_deleted` flag for soft deletion
- Materialized views for data aggregation (not raw data exposure)
- No secrets in code — all via environment variables

---

## 14. Caching Strategy

### 14.1 Three-Tier Cache (`cache.ts`)

| Tier | Storage | TTL | Eviction | Purpose |
|---|---|---|---|---|
| L1 | In-memory Map | 30 seconds | 150 items (oldest) | Hot data, SSR |
| L2 | Upstash Redis | Configurable | TTL-based | Cache hit on cold start |
| L3 | Database | N/A | N/A | Fallback fetcher |

### 14.2 Advanced Patterns

- **Stale-While-Revalidate (SWR):** Serves stale L1 data immediately while background-refreshing
- **In-Flight Deduplication:** `Map<string, Promise<unknown>>` prevents thundering herd — concurrent requests for the same key share one pending promise
- **Campaign Invalidation:** `invalidateCampaign(id)` deletes all keys matching `campaign:<id>:*`
- **Cache Key Builder:** `cacheKey.dashboard(id)`, `cacheKey.overview(id)`, etc. for consistent naming
- **Redis Write Strategy:** Fire-and-forget (`.catch(() => {})`) — cache refresh failures don't crash requests

### 14.3 React Query Client (`queryClient.ts`)

- `staleTime`: 24 hours (aggressive)
- `gcTime`: 7 days (keep unused data)
- `refetchOnWindowFocus`: disabled
- `refetchOnReconnect`: disabled

---

## 15. Deployment & Infrastructure

### 15.1 Primary: Vercel (Serverless)

```json
// vercel.json
{ "crons": [
  { "path": "/api/warm", "schedule": "0 7 * * *" },
  { "path": "/api/cron?job=daily_views", "schedule": "0 8 * * *" },
  { "path": "/api/cron?job=sheets_sync", "schedule": "0 9 * * *" }
]}
```

- Serverless functions via Next.js App Router
- CDN caching with `revalidate: 60`
- Immutable static asset caching (1 year)

### 15.2 Worker: Separate Deployment

The BullMQ worker runs as a **separate Node.js process**:
- Local: `npm run worker`
- Production: `npm run worker:prod`
- Deployment targets: Docker on ECS/Fargate, Kubernetes, Railway.app worker

### 15.3 Required Services

| Service | Purpose | Free Tier |
|---|---|---|
| Supabase | PostgreSQL database + RPCs | Yes |
| Upstash Redis | BullMQ queue + L2 cache | Yes (256MB) |
| Vercel | Frontend + API hosting | Yes (pro plan recommended) |
| YouTube Data API | Search + video data | 10K units/day default |
| OpenRouter | AI brand analysis (GPT-4o-mini) | Pay-as-you-go |
| Groq | Whisper STT (transcript fallback) | Free tier available |

### 15.4 Database Migration

- Migration files in `schema/` (4 numbered files + fix scripts)
- Migration runner in `src/lib/migrations.ts`
- Tracks applied migrations in `_migrations` table
- `run-all` applies all pending migrations in order
- Materialized views refreshed concurrently post-migration

---

## 16. Configuration & Environment Variables

### 16.1 Required Variables

```bash
# Core
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Redis (pick one)
REDIS_URL=redis://localhost:6379           # Local
UPSTASH_REDIS_REST_URL=https://...upstash.io      # Serverless
UPSTASH_REDIS_REST_TOKEN=your-token

# YouTube OAuth
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback

# Encryption
API_KEY_ENCRYPTION_SECRET=your-32-char-secret-minimum

# AI
OPENROUTER_API_KEY=sk-or-...              # Brand analysis (GPT-4o-mini)
GROQ_API_KEY=gsk_...                      # Whisper STT (transcript fallback)

# Cron
CRON_SECRET=your-cron-secret

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=optional-existing-sheet-id

# Auth
JWT_SECRET=sov_dashboard_secret_key_minimum_32_characters
```

### 16.2 Build Configuration

```typescript
// next.config.ts
{
  serverExternalPackages: ['better-sqlite3'],  // Server-only
  compress: true                               // Brotli/Gzip
}
```

---

## 17. Open Questions & Design Decisions

### 17.1 Growth Rate Definition (Open Question #1)
**Status:** Growth of raw view count, applied consistently across Pages 1, 3, and 7.
**Implementation:** Uses window function `LAG(...) OVER (PARTITION BY video_id ORDER BY snapshot_date)` to calculate period-over-period growth. Growth percentage = `(current_views - previous_views) / previous_views × 100`.

### 17.2 Two Last-Updated Timestamps (Open Question #2)
**Status:** Two separate timestamps maintained: `last_views_refresh` and `last_ranking_refresh`. Map to two separate n8n/cron jobs (views refresh runs daily, ranking refresh runs weekly).

### 17.3 Region Tracking (Open Question #3)
**Status:** Region tracking is implemented via **keyword-level language tags**. Videos inherit languages from keywords they rank on. The India regions system maps `langCode → Indian state/region`. Geo-level YouTube API data (video-level region code) is not yet integrated — this is a future data pipeline requirement.

### 17.4 Multi-Keyword Threshold (Open Question #4)
**Status:** Implemented as a **filter dropdown** (5+ / 10+ / 15+), not a hardcoded value. The dropdown drives a `gte('keyword_count', minKeywords)` query.

### 17.5 Common Terminology Summary (Open Question #5)
**Status:** Implemented via AI-powered phrase extraction. Uses GPT-4o-mini (via OpenRouter) to identify common terms/phrases across multi-keyword-ranking videos. Results stored in `video_phrase_summary.extracted_phrases[]`.

### 17.6 "Most Ranking Channel" Definition (Open Question #6)
**Status:** Defined as **channel with the highest cumulative frequency count** across all its videos (not channel with most videos ranking). Implemented via `channel_rank_mv` materialized view ordered by `total_frequency DESC`.

### 17.7 Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Dual DB (SQLite + PostgreSQL)** | SQLite for local dev without network dependencies; PostgreSQL for production with Supabase. The PG pipeline is the active target. |
| **Two scrape pipelines** | Migration in progress from SQLite → PostgreSQL. Both exist to support gradual migration. |
| **Inline SQL over ORM** | Direct SQL avoids ORM overhead for complex analytics queries. Custom `exec_sql` RPC for database abstraction. |
| **Inline styles in main page** | The overview page (~3400 lines) uses inline `style` objects for performance (no Tailwind JIT overhead for this heavy analytics page). Other pages use Tailwind. |
| **Single-page dashboard** | All 9 tabs on one page with `useState` tab switching enables cross-tab state sharing and instant switching. |
| **BullMQ over n8n** | BullMQ handles internal recurring jobs (daily views, weekly refresh); n8n handles external orchestration (keyword intake, scraping). Two-tier approach provides flexibility. |
| **Demo data fallback** | Pre-built Water Purifier market demo ensures the dashboard is never empty for first-time users without live data. |

### 17.8 Current Limitations & Future Work

1. **Single-campaign focus** — Multi-campaign comparison is not yet a UI feature
2. **No real-time updates** — Users must refresh manually or wait for cron jobs
3. **No export scheduling** — Google Sheets export is cron-triggered but not user-configurable
4. **No webhook notifications** — Alert rules exist in schema but webhook delivery is not fully implemented
5. **No A/B testing framework** — Can't compare two time periods side-by-side
6. **Dual DB maintenance burden** — Schema must be kept in sync across SQLite and PostgreSQL
7. **No rate-limit UI** — YouTube quota status visible via API but not exposed in dashboard UI
8. **Limited test coverage** — Only brand analyzer has unit tests (Vitest)
9. **Full extraction mode** — LLM still does extraction + classification (classification-only mode designed but not implemented)
10. **No LLM cost dashboard** — Usage tracking exists in database but no UI for cost monitoring

---

*Document generated from complete codebase analysis — cross-referenced across all source files, schema definitions, API routes, and configuration files.*

*Total analyzed: 80+ files across 4 layers (frontend pages, API routes, lib modules, schema definitions)*
