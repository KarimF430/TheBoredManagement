# Campaign Management Panel — Complete Project Specification

## THE PROBLEM

**TheBoredMonkey (TBM)** is an influencer marketing agency. Currently, campaign management runs on **Google Sheets + WhatsApp + email**. This causes:

1. **No centralized tracking** — Creator status, content approval, and performance metrics live in separate spreadsheets
2. **Manual SLA tracking** — No automated alerts when deadlines are missed
3. **No client portal** — Clients get WhatsApp updates instead of a real-time dashboard
4. **No audit trail** — Who changed what, when, is undocumented
5. **No performance analytics** — Views/engagement data is manually copied from YouTube Studio
6. **Script approval chaos** — Scripts flow via email with no version control
7. **Cost negotiation opacity** — Internal vs quoted costs tracked in separate sheets

**Goal:** Replace Google Sheets with a **Campaign Management Panel** — a Next.js web app that manages the entire influencer campaign lifecycle from brief to report.

---

## THE END PRODUCT

A **two-portal web application**:

### 1. Internal Portal (Campaign Panel)
For TBM team members (5 roles). Full campaign lifecycle management.

### 2. Client Portal
For brand clients. View-only dashboard showing their campaign's progress, content, and metrics.

---

## USER ROLES

| Role | Access Level | Can Do |
|---|---|---|
| **Brand Solutions** | Full access | Create campaigns, manage team, invite clients, all CRUD |
| **Campaign Manager** | Full access | Same as Brand Solutions |
| **IR Manager** | Campaign-scoped | Manage creators, approve scripts, update statuses |
| **IR Executive** | Campaign-scoped | Add creators, submit scripts, update deliverables |
| **Client** | Read-only, single campaign | View campaign progress, content, metrics |

---

## CAMPAIGN LIFECYCLE (The Workflow)

A campaign goes through these stages:

```
DRAFT → ACTIVE → (PAUSED) → COMPLETED → ARCHIVED
```

Within each campaign, creators go through:

```
SHORTLISTED → CLIENT REVIEW → NEGOTIATING → ONBOARDED → ACTIVE → COMPLETED
                                                          ↓
                                                       REJECTED
```

Content deliverables go through:

```
PENDING → SCRIPT PENDING → SCRIPT APPROVED → FILMING → IN REVIEW → APPROVED → LIVE
```

---

## DATABASE SCHEMA (14 Tables)

### Core Tables

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | TBM team members | email, password_hash, role |
| `cp_campaigns` | Campaign master record | name, brand, status, budget, go_live_date, SLA fields, brief |
| `cp_creators` | Creators shortlisted for a campaign | channel_name, platform, cost (internal + quoted), status |
| `cp_deliverables` | Content pieces per creator per platform | platform, status, live_link, views/likes/comments, script_version |
| `cp_campaign_roles` | Maps users to campaigns | user_id, campaign_id, role |

### Workflow Tables

| Table | Purpose |
|---|---|
| `cp_negotiation_log` | Cost negotiation rounds (offered vs returned) |
| `cp_script_versions` | Script versioning with approval status |
| `cp_status_history` | Audit trail for all status changes |

### Communication Tables

| Table | Purpose |
|---|---|
| `cp_notifications` | In-app notifications (your_turn, digest, escalation, deadline) |
| `cp_activity_feed` | Activity log (who did what, when) |
| `cp_email_log` | Transactional email tracking |
| `cp_client_users` | Client portal users |

### Intelligence Tables

| Table | Purpose |
|---|---|
| `cp_rejection_intelligence` | Stores rejection reasons for pattern analysis |

---

## API ROUTES (13 Endpoints)

### Campaign CRUD
- `GET /api/campaigns` — List campaigns (role-filtered)
- `POST /api/campaigns` — Create campaign (BS/CM only)
- `GET /api/campaigns/[id]` — Get campaign + computed KPIs
- `PATCH /api/campaigns/[id]` — Update campaign fields

### Creator Management
- `GET /api/campaigns/[id]/creators` — List creators (hide internal_cost from client)
- `POST /api/campaigns/[id]/creators` — Add creator to shortlist
- `PATCH /api/campaigns/[id]/creators/[creatorId]` — Update status/cost
- `DELETE /api/campaigns/[id]/creators/[creatorId]` — Remove creator

### Content Pipeline
- `GET /api/campaigns/[id]/deliverables` — List deliverables
- `PATCH /api/campaigns/[id]/deliverables` — Update status/metrics
- `GET /api/campaigns/[id]/scripts` — List script versions
- `POST /api/campaigns/[id]/scripts` — Submit new script
- `PATCH /api/campaigns/[id]/scripts` — Approve/reject script

### Settings & Team
- `GET /api/campaigns/[id]/settings` — Get SLA config, team, clients
- `PATCH /api/campaigns/[id]/settings` — Update SLA/POC
- `GET /api/campaigns/[id]/clients` — List client users
- `POST /api/campaigns/[id]/clients` — Invite client
- `DELETE /api/campaigns/[id]/clients` — Remove client

### Notifications & Activity
- `GET /api/campaigns/[id]/activity` — Activity feed
- `GET /api/campaigns/[id]/notifications` — Notifications
- `PATCH /api/campaigns/[id]/notifications` — Mark read

---

## PAGES (12 Routes)

### Campaign List
- **Route:** `/campaigns`
- **Shows:** Grid of campaign cards with name, brand, status badge, go-live date, budget, days remaining
- **Actions:** Create new campaign

### New Campaign Form
- **Route:** `/campaigns/new`
- **Fields:** Name, brand, campaign type (6 options), objective, platform mix (5 toggles), deliverable types (6 toggles), budget, start date, go-live date, mandatories
- **Actions:** Save as Draft, Save & Activate

### Campaign Overview Dashboard
- **Route:** `/campaigns/[id]`
- **Shows:** 6 KPI cards (Creators, Deliverables, Views, Engagement, Spend, CPV), margin block, days remaining, posts by format, 8 quick-action buttons
- **Computed KPIs:** Total views, engagement rate, blended CPV, margin %, creators by status

### Brief Page
- **Route:** `/campaigns/[id]/brief`
- **Shows:** Read-only campaign details (brand, budget, platforms, go-live), editable objective textarea, editable mandatories textarea
- **Actions:** Save brief (tracks last edited timestamp)

### Creator Shortlist
- **Route:** `/campaigns/[id]/shortlist`
- **Shows:** Table of creators with status, platform, followers, avg views, engagement, cost
- **Actions:** Add creator (slide-in drawer), search, filter by status, reject creators
- **Client view:** Hides internal_cost column

### Content Pipeline (Kanban)
- **Route:** `/campaigns/[id]/content`
- **Shows:** 7-column Kanban board: Pending → Script Pending → Script Approved → Filming → In Review → Approved → Live
- **Actions:** Click card for detail drawer, change status, submit scripts, approve scripts, add live link

### Live Tracking
- **Route:** `/campaigns/[id]/tracking`
- **Shows:** KPI cards (Views, Likes, Comments, Shares, Engagement, Live Posts), platform breakdown, filterable table
- **Actions:** Refresh metrics (YouTube/Instagram API), filter by platform

### Campaign Report
- **Route:** `/campaigns/[id]/report`
- **Shows:** Spotlight KPIs, platform performance bars, spend distribution, top performers by views, creator pipeline breakdown, financial summary (margin)
- **Data:** Aggregated from all deliverables and creators

### Activity Feed
- **Route:** `/campaigns/[id]/activity`
- **Shows:** Timeline grouped by date, actor name + role, action verb, entity name, details diff, time-ago
- **Actions:** Filter by action type (all, created, status_changed, remarked, approved, rejected)

### Notifications
- **Route:** `/campaigns/[id]/notifications`
- **Shows:** Notification cards with type-colored dots (your_turn, digest, escalation, deadline), read/unread state
- **Actions:** Mark as read, mark all read, filter unread

### Campaign Settings
- **Route:** `/campaigns/[id]/settings`
- **Shows:** 3 tabs:
  - **SLA Config:** Editable time limits (client feedback, script delivery, content delivery, onboard-to-live)
  - **Team:** Assigned team members with roles
  - **Client Access:** Invite/remove client users, view status

### Client Portal
- **Route:** `/client`
- **Shows:** Simplified view of assigned campaign (read-only)

---

## DESIGN SYSTEM

### Visual Language
- **Style:** Glassmorphic bright graphic suite (premium, modern, high-density dashboard)
- **Font:** Plus Jakarta Sans (primary), JetBrains Mono (monospace)
- **Base font size:** 14px with zoom: 0.8

### Color Tokens
- **Primary:** `#1A73E8` (Google Blue)
- **Success:** `#00C853` (Emerald)
- **Warning:** `#FF6D00` (Orange)
- **Danger:** `#FF2D55` (Red)
- **Info:** `#7C3AED` (Violet)
- Each has `-hover`, `-gradient`, `-glow`, `-dim` variants

### Component Classes
| Class | Purpose |
|---|---|
| `.card` | Glassmorphic white with blur, 14px radius, 24px padding |
| `.kpi-card` | KPI metric card with icon wrapper, hover lift |
| `.btn`, `.btn-blue`, `.btn-ghost`, `.btn-danger` | Button system with hover/active states |
| `.badge-*` | Status badges (blue, green, red, orange, purple, gray) |
| `.data-table` | Sticky headers, hover rows, proper spacing |
| `.input`, `.textarea` | Form inputs with focus ring |
| `.toggle-group` / `.toggle-btn` | Pill toggles for filters |
| `.kanban-board` / `.kanban-column` / `.kanban-card` | Kanban system |
| `.nav-item` / `.nav-item__rail` / `.nav-item__dot` | Sidebar navigation |
| `.state-panel` | Empty/error/loading states |
| `.toast` | Notification popups |
| `.skeleton` | Loading skeleton with shimmer |

### Animations
- `fadeUp` — Page entrance (opacity 0→1, translateY 12→0)
- `fadeIn` — Simple opacity
- `slideIn` — Drawer entrance (translateX 100%→0)
- `shimmer` — Skeleton loading pulse
- Stagger delays: `.anim-delay-1` through `.anim-delay-6`

### Layout
- **Sidebar:** 220px (collapsed: 58px), fixed left
- **Header:** 54px, sticky top
- **Page wrapper:** 20px padding, full width
- **Grid system:** `.grid-2/3/4/kpi` with auto-fit minmax

### Responsive Breakpoints
- 1366px — Reduced padding, smaller fonts
- 1100px — Narrower sidebar, tighter spacing
- 840px — Stacked layouts, smaller cards
- 640px — Sidebar icons only, minimal padding

---

## SLA SYSTEM

Each campaign has configurable time limits:

| SLA | Default | Purpose |
|---|---|---|
| Client Feedback | 48 hours | Time for client to respond to scripts/content |
| Script Delivery | 5 days | Time to deliver script after creator onboarded |
| Content Delivery | 7 days | Time to deliver final content after script approved |
| Onboard to Live | 15 days | Total time from creator onboarded to content live |

SLA breaches trigger:
- Visual warnings (red badges, overdue indicators)
- Notifications to relevant team members
- Escalation to campaign manager

---

## NOTIFICATION SYSTEM

### Types
| Type | Trigger | Priority |
|---|---|---|
| `your_turn` | Action needed from you | High |
| `digest` | Daily summary of activity | Low |
| `escalation` | SLA breach or deadline missed | High |
| `deadline` | Upcoming deadline warning | Medium |

### Channels
- In-app notification center
- Email (via Resend API — not yet implemented)

---

## METRICS TRACKING

### Auto-Tracked (via YouTube/Instagram API — not yet implemented)
- Views, likes, comments, shares
- Engagement rate
- Subscriber count changes

### Manual Entry
- Live link submission
- Product ETA

### Computed KPIs
- **Blended CPV:** Total Spend / Total Views
- **Engagement Rate:** (Likes + Comments) / Views × 100
- **Margin:** Client Billed - Internal Cost
- **Margin %:** Margin / Client Billed × 100

---

## WHAT'S BEEN BUILT (Current State)

### Complete
- Database schema (14 tables, all indexed)
- Authentication system (5 roles, JWT, middleware)
- All 13 API routes
- Campaign list, overview, brief pages (polished)
- Report page (new, polished)
- Sidebar with active indicators (polished)
- Design system (CSS classes, reusable components)
- Content Pipeline Kanban (functional)
- Live Tracking page (functional)
- Settings page with 3 tabs (functional)

### Partially Built (functional but unpolished UI)
- New Campaign form (needs glassmorphic treatment)
- Shortlist page (needs table/drawer polish)
- Activity feed (needs skeleton loading, hover states)
- Notifications page (needs skeleton loading, hover states)

### Not Started
- YouTube/Instagram API integration for auto-tracking
- Email notifications (Resend integration)
- Client portal login/accept flow
- Drag-and-drop Kanban reordering
- Script PDF export
- Campaign deletion (soft delete)
- User role management UI
- Global search (Cmd+K)
- Breadcrumb navigation
- Dark mode
- Mobile responsive optimization

---

## TECH STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (jose) + PBKDF2 (Web Crypto API) |
| Styling | CSS Custom Properties + Inline Styles |
| Icons | Lucide React |
| Deployment | Vercel (planned) |

---

## SUCCESS METRICS

| Metric | Target |
|---|---|
| Time to create campaign | < 2 minutes (vs 15+ min in Sheets) |
| Time to onboard creator | < 1 minute |
| Script approval turnaround | < 24 hours (tracked via SLA) |
| Client visibility | Real-time dashboard (vs weekly WhatsApp updates) |
| Audit trail coverage | 100% of status changes logged |
| Metric freshness | < 1 hour delay (vs manual daily copy) |
