# TheBoredManagement - Complete Codebase Inventory

> Campaign management panel for influencer marketing. Next.js App Router, Zustand state, Tailwind CSS, 5 role-based access system.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Route Structure](#route-structure)
- [Component Inventory](#component-inventory)
- [State Management](#state-management)
- [Authentication & Authorization](#authentication--authorization)
- [Design System](#design-system)
- [Backend API Structure](#backend-api-structure)
- [Key Files Reference](#key-files-reference)

---

## Architecture Overview

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # 32 API route directories
│   ├── admin/              # Admin dashboard
│   ├── campaigns/          # Campaign management
│   ├── client/             # Client portal (separate layout)
│   ├── creators/           # Creator database
│   ├── outreach/           # Email outreach system
│   ├── scraper/            # YouTube/social scraper
│   ├── creator-onboarding/ # Creator onboarding wizard
│   ├── onboarding/         # Onboarding admin dashboard
│   └── login/              # Authentication
├── components/
│   ├── cp/                 # 23 campaign panel components
│   ├── creator-onboarding/ # 14 onboarding wizard components
│   ├── Providers.tsx       # QueryClient + ThemeProvider
│   └── CustomThemeProvider.tsx # Light/dark theme
├── hooks/
│   └── useCampaignData.ts  # Zustand sync hook
├── lib/
│   ├── store.ts            # Zustand global store
│   ├── cp-auth.ts          # JWT auth (PBKDF2 + jose)
│   ├── campaign-permissions.ts # Role-based permissions
│   └── 40+ utility modules # email, scraper, youtube, etc.
├── middleware.ts            # Route protection + role routing
└── app/globals.css         # Design system (CSS variables)
```

**Key Technologies:**
- **Framework:** Next.js 14+ (App Router)
- **State:** Zustand (global store) + React Query (server state)
- **Styling:** Tailwind CSS + CSS variables (light/dark themes)
- **Auth:** JWT (jose) + PBKDF2 (Web Crypto API, Edge-compatible)
- **Icons:** lucide-react
- **Charts:** Recharts
- **Animations:** Framer Motion

---

## Route Structure

### Public / Auth Routes

| Route | File | Description |
|-------|------|-------------|
| `/login` | `src/app/login/page.tsx` | Full-screen split login (branding left, form right) |
| `/` | `src/app/page.tsx` | Root redirector |
| `/privacy-policy` | `src/app/privacy-policy/page.tsx` | Styled legal page |

### Creator Onboarding (Public)

| Route | File | Description |
|-------|------|-------------|
| `/creator-onboarding` | `src/app/creator-onboarding/page.tsx` | Token verification landing page |
| `/creator-onboarding/[token]/steps` | `src/app/creator-onboarding/[token]/steps/page.tsx` | 10-step wizard (identity, niche, language, type, format, metrics, brands, behavioral, willingness, rates) |
| `/creator-onboarding/[token]/success` | `src/app/creator-onboarding/[token]/success/page.tsx` | Confetti success page with next steps |

### Admin Routes

| Route | File | Description |
|-------|------|-------------|
| `/admin` | `src/app/admin/page.tsx` | Command centre dashboard with KPIs, bar/pie charts, top performers |
| `/admin/employees` | `src/app/admin/employees/page.tsx` | Team performance with role filter, workload bars |

### Campaign Routes

| Route | File | Description |
|-------|------|-------------|
| `/campaigns` | `src/app/campaigns/page.tsx` | Campaign card grid with status/date/budget |
| `/campaigns/new` | `src/app/campaigns/new/page.tsx` | Campaign creation form (platform chips, deliverables, dates) |
| `/campaigns/[id]` | `src/app/campaigns/[id]/page.tsx` | Overview with KPI cards, SLA dashboard, product shipments |
| `/campaigns/[id]/brief` | `src/app/campaigns/[id]/brief/page.tsx` | Brief editor with auto-save, undo, version history |
| `/campaigns/[id]/shortlist` | `src/app/campaigns/[id]/shortlist/page.tsx` | Creator shortlist with search, negotiation, bulk import |
| `/campaigns/[id]/content` | `src/app/campaigns/[id]/content/page.tsx` | Kanban content pipeline with detail drawer |
| `/campaigns/[id]/tracking` | `src/app/campaigns/[id]/tracking/page.tsx` | Live metrics tracking with link analytics |
| `/campaigns/[id]/report` | `src/app/campaigns/[id]/report/page.tsx` | Report with export (CSV/PDF), charts, financial summary |
| `/campaigns/[id]/activity` | `src/app/campaigns/[id]/activity/page.tsx` | Activity audit trail with role-colored timeline |
| `/campaigns/[id]/notifications` | `src/app/campaigns/[id]/notifications/page.tsx` | Typed notifications with glow effects, mark read |
| `/campaigns/[id]/settings` | `src/app/campaigns/[id]/settings/page.tsx` | SLA config, team assignment, client access management |

### Creator Routes

| Route | File | Description |
|-------|------|-------------|
| `/creators` | `src/app/creators/page.tsx` | Creator database with niche/tier filters, pagination |
| `/creators/[id]` | `src/app/creators/[id]/page.tsx` | Creator profile with stats, commercials, history |

### Client Portal

| Route | File | Description |
|-------|------|-------------|
| `/client` | `src/app/client/page.tsx` | Campaign selector, KPIs, tabs (overview/brief/shortlist/content/report), accept/reject actions |
| `/client/layout.tsx` | `src/app/client/layout.tsx` | Separate layout (sticky header with TB logo, no sidebar) |

### Outreach Routes

| Route | File | Description |
|-------|------|-------------|
| `/outreach` | `src/app/outreach/page.tsx` | Command center with ramp progress, mailbox health, queue, replies |
| `/outreach/campaigns` | `src/app/outreach/campaigns/page.tsx` | Campaign list with status management |
| `/outreach/campaigns/[id]` | `src/app/outreach/campaigns/[id]/page.tsx` | Campaign detail with funnel visualization, tabs (overview/creators/template/queue) |
| `/outreach/creators` | `src/app/outreach/creators/page.tsx` | Creator table with bulk select, bridge-to-outreach |
| `/outreach/templates` | `src/app/outreach/templates/page.tsx` | Email template CRUD with tier/stage filtering |
| `/outreach/domains` | `src/app/outreach/domains/page.tsx` | Domain + mailbox management with SPF/DKIM/DMARC verification |
| `/outreach/settings` | `src/app/outreach/settings/page.tsx` | Ramp config, deliverability thresholds |

### Scraper Routes

| Route | File | Description |
|-------|------|-------------|
| `/scraper` | `src/app/scraper/page.tsx` | Dashboard with pipeline stats, circuit breaker, workers |
| `/scraper/youtube` | `src/app/scraper/youtube/page.tsx` | YouTube scraper with search/jobs/results |
| `/scraper/filtered` | `src/app/scraper/filtered/page.tsx` | Filtered creators with push-to-outreach |
| `/scraper/workers` | `src/app/scraper/workers/page.tsx` | Worker status monitor |
| `/scraper/cookies` | `src/app/scraper/cookies/page.tsx` | Cookie management with login flow and bookmarklet |
| `/scraper/results` | `src/app/scraper/results/page.tsx` | Raw scraped profiles with filters |
| `/scraper/new` | `src/app/scraper/new/page.tsx` | New scrape job form |
| `/scraper/jobs` | `src/app/scraper/jobs/page.tsx` | Job list with pause/resume/cancel |

### Onboarding Admin

| Route | File | Description |
|-------|------|-------------|
| `/onboarding` | `src/app/onboarding/page.tsx` | Admin dashboard with analytics, sessions, pilot control (select top 500, gate check) |

---

## Component Inventory

### Shell & Layout (`src/components/cp/`)

| Component | File | Description |
|-----------|------|-------------|
| `CampaignShell` | `CampaignShell.tsx` | Main app shell (sidebar + header + providers) |
| `CampaignSidebar` | `CampaignSidebar.tsx` | Navigation with module/campaign/outreach/onboarding sections |
| `CampaignHeader` | `CampaignHeader.tsx` | Sticky header with search, theme toggle, notifications, user menu |

### Providers

| Component | File | Description |
|-----------|------|-------------|
| `Providers` | `src/components/Providers.tsx` | QueryClientProvider + ThemeProvider wrapper |
| `CustomThemeProvider` | `src/components/CustomThemeProvider.tsx` | Light/dark theme with localStorage persistence |
| `ToastProvider` | `ToastProvider.tsx` | Toast notification context |
| `ModalProvider` | `ModalProvider.tsx` | Modal state context |

### Campaign UI (`src/components/cp/CampaignUI.tsx`)

| Export | Description |
|--------|-------------|
| `StatusBadge` | Status badge with color coding |
| `KPISkeleton` | KPI loading skeleton |
| `TableSkeleton` | Table loading skeleton |
| `LoadingState` | Full-page loading state |
| `EmptyState` | Empty state with icon and message |
| `ErrorState` | Error state with retry button |
| `Toast` | Toast notification component |
| `formatNumber` | Number formatting utility |
| `formatCurrency` | Currency formatting utility |

### Feature Components (`src/components/cp/`)

| Component | File | Description |
|-----------|------|-------------|
| `SLADashboard` | `SLADashboard.tsx` | SLA tracking with progress bars |
| `ProductShipments` | `ProductShipments.tsx` | Product shipment timeline |
| `StatusHistoryViewer` | `StatusHistoryViewer.tsx` | Status change history |
| `DragDropKanban` | `DragDropKanban.tsx` | Content pipeline Kanban board |
| `ProductTimeline` | `ProductTimeline.tsx` | Product delivery timeline |
| `OnboardingLock` | `OnboardingLock.tsx` | Creator onboarding lock state |
| `BriefVersionHistory` | `BriefVersionHistory.tsx` | Brief version diff viewer |
| `BulkImport` | `BulkImport.tsx` | Bulk creator import |
| `NegotiationHistory` | `NegotiationHistory.tsx` | Creator negotiation history |
| `LinkAnalytics` | `LinkAnalytics.tsx` | UTM link analytics |

### Utility Components (`src/components/cp/`)

| Component | File | Description |
|-----------|------|-------------|
| `CommandPalette` | `CommandPalette.tsx` | Command palette (Cmd+K) |
| `ContextMenu` | `ContextMenu.tsx` | Right-click context menu |
| `DataTable` | `DataTable.tsx` | Generic data table component |
| `InlineEdit` | `InlineEdit.tsx` | Inline editing component |
| `KeyboardShortcuts` | `KeyboardShortcuts.tsx` | Global keyboard shortcuts |
| `NotificationsDropdown` | `NotificationsDropdown.tsx` | Notifications dropdown |
| `QuickActions` | `QuickActions.tsx` | Quick action buttons |

### Creator Onboarding Components (`src/components/creator-onboarding/`)

| Component | File | Description |
|-----------|------|-------------|
| `AutoAdvanceButton` | `AutoAdvanceButton.tsx` | Auto-advancing selection button |
| `BinarySwipeCard` | `BinarySwipeCard.tsx` | Swipeable yes/no card |
| `BrandTagInput` | `BrandTagInput.tsx` | Brand tag input with provenance |
| `ConfirmPrompt` | `ConfirmPrompt.tsx` | AI prediction confirmation |
| `FormatChips` | `FormatChips.tsx` | Content format selection chips |
| `IdentityConstellation` | `IdentityConstellation.tsx` | Progress visualization |
| `MetricStat` | `MetricStat.tsx` | Metric display with provenance |
| `NicheSelector` | `NicheSelector.tsx` | Two-tap cluster/niche selector |
| `PredictiveLanguageSelect` | `PredictiveLanguageSelect.tsx` | Language selection with prediction |
| `ProgressCue` | `ProgressCue.tsx` | Progress indicator |
| `RateChip` | `RateChip.tsx` | Rate input chip |
| `StepIndicator` | `StepIndicator.tsx` | Step progress indicator |
| `SwipeableCard` | `SwipeableCard.tsx` | Swipeable card base |
| `TypeCard` | `TypeCard.tsx` | Creator type selection |

---

## State Management

### Zustand Store (`src/lib/store.ts`)

**Entities:**
```typescript
interface CampaignStore {
  // Data
  campaigns: Campaign[]
  creators: Creator[]
  deliverables: Deliverable[]
  teamMembers: TeamMember[]
  trackedLinks: TrackedLink[]
  shipments: ProductShipment[]

  // UI State
  selectedCampaignId: string | null
  loading: Record<string, boolean>
  errors: Record<string, string | null>

  // Undo/Redo
  undoStack: UndoAction[]
  redoStack: UndoAction[]
}
```

**Features:**
- CRUD operations for all entities
- Optimistic updates with revert on failure
- Undo/redo stack (field-level granularity)
- Loading/error states per entity key

### React Query

- Used via `@tanstack/react-query` in `Providers.tsx`
- Custom `queryClient.ts` setup
- Server state caching and invalidation

### Custom Hooks

| Hook | File | Description |
|------|------|-------------|
| `useCampaignData` | `src/hooks/useCampaignData.ts` | Syncs API data into Zustand store |
| `useOptimisticUpdate` | `src/hooks/useCampaignData.ts` | Optimistic updates with revert on failure |

---

## Authentication & Authorization

### Middleware (`src/middleware.ts`)

**Route Protection:**
- **Public routes:** `/login`, `/client/login`, `/client/accept`, `/creator-onboarding`, API auth routes
- **Internal prefixes:** `/campaigns`, `/admin`
- **Client prefixes:** `/client`

**Flow:**
1. Check if route is public → skip auth
2. Extract `cp_session` cookie
3. Verify JWT via `cp-auth.ts`
4. Role-based routing:
   - `client` → only `/client` routes allowed
   - Internal roles → redirect away from `/client`
5. Attach session to headers (`x-cp-user-*`)

### Auth Module (`src/lib/cp-auth.ts`)

**Roles (5):**
1. `brand_solutions` - Full access to all campaigns
2. `campaign_manager` - Full access to all campaigns
3. `ir_manager` - Access to assigned campaigns only
4. `ir_executive` - Access to assigned campaigns only
5. `client` - Access to assigned campaigns only (client portal)

**Security:**
- Password hashing: PBKDF2 (100k iterations, SHA-512, Web Crypto API)
- JWT: HS256, 7-day expiry, jose library
- Cookie: `cp_session`, httpOnly, secure, sameSite=lax

**Authorization Logic:**
```typescript
// brand_solutions and campaign_manager → all campaigns
if (session.role === 'brand_solutions' || session.role === 'campaign_manager') {
  return { authorized: true }
}

// ir_manager, ir_executive, client → check campaign_ids
if (!session.campaign_ids.includes(campaignId)) {
  return { authorized: false, error: 403 }
}
```

---

## Design System

### CSS Variables (`src/app/globals.css`)

**Light Theme (default):**
```css
--blue: #2563EB
--green: #059669
--orange: #D97706
--purple: #7C3AED
--red: #DC2626

--bg-base: #F4F5F7
--bg-surface: #FFFFFF
--bg-card: #FFFFFF
--bg-elevated: #F7F8FA
--bg-sidebar: #FAFBFC

--border-1: #DFE1E6
--border-2: #C1C7D0

--text-primary: #172B4D
--text-secondary: #6B778C
--text-muted: #97A0AF
```

**Dark Theme (`[data-theme="dark"]`):**
```css
--bg-base: #0B1120
--bg-surface: #151D2E
--bg-card: #151D2E
--bg-elevated: #1C2740

--border-1: #1E2D44
--border-2: #2A3B55

--text-primary: #E2E8F0
--text-secondary: #94A3B8
--text-muted: #64748B
```

**Onboarding Palette (Studio Dusk):**
```css
--onb-bg: #161428
--onb-coral: #FF5A5F
--onb-violet: #7C6FB0
--onb-green: #3FBF8F
--onb-font-display: 'Plus Jakarta Sans'
--onb-font-body: 'DM Sans'
```

**Typography:**
- Primary: Inter (400-900)
- Mono: JetBrains Mono (400-600)
- Display: Plus Jakarta Sans (500-800)
- Body: DM Sans (400-700)

**Layout Variables:**
```css
--sidebar-w: 220px
--sidebar-collapsed: 48px
--header-h: 44px
--radius-sm: 4px
--radius: 6px
--radius-lg: 8px
```

---

## Backend API Structure

### API Routes (`src/app/api/`)

```
api/
├── admin/              # Admin dashboard data
├── alerts/             # Alert management
├── analytic-calendar/  # Calendar analytics
├── api-keys/           # API key management
├── auth/               # Authentication
│   ├── login/          # POST /api/auth/login
│   ├── logout/         # POST /api/auth/logout
│   ├── me/             # GET /api/auth/me
│   ├── otp/            # OTP verification
│   ├── gmail/          # Gmail OAuth
│   └── youtube/        # YouTube OAuth
├── campaigns/          # Campaign CRUD
│   ├── route.ts        # GET /api/campaigns, POST /api/campaigns
│   └── [id]/           # Nested resources (creators, deliverables, etc.)
├── channel/            # Channel data
├── client/             # Client portal API
│   └── accept-invite/  # POST /api/client/accept-invite
├── creator-onboarding/ # Creator onboarding
│   ├── session/        # GET/POST/DELETE /api/creator-onboarding/session
│   ├── sessions/       # GET/POST /api/creator-onboarding/sessions
│   ├── save-step/      # POST /api/creator-onboarding/save-step
│   ├── complete/       # POST /api/creator-onboarding/complete
│   ├── prefill/        # POST /api/creator-onboarding/prefill
│   ├── verify-handle/  # POST /api/creator-onboarding/verify-handle
│   ├── analytics/      # GET /api/creator-onboarding/analytics
│   ├── pilot/          # POST /api/creator-onboarding/pilot
│   ├── otp/            # OTP for creator verification
│   └── niches/         # GET /api/creator-onboarding/niches
├── creators/           # Creator database
├── cron/               # Cron jobs
├── dashboard/          # Dashboard data
├── keywords/           # Keyword management
├── links/              # Link tracking
├── outreach/           # Outreach system
│   ├── campaigns/      # Outreach campaign CRUD
│   ├── templates/      # Email template CRUD
│   ├── domains/        # Domain management
│   └── settings/       # Outreach settings
├── overview/           # Overview data
├── scraper/            # Scraper system
│   ├── jobs/           # Scrape job management
│   ├── workers/        # Worker status
│   ├── cookies/        # Cookie management
│   └── youtube/        # YouTube scraper
├── search/             # Search functionality
├── settings/           # App settings
├── setup/              # Initial setup
├── setup-campaign/     # Campaign setup
├── sla/                # SLA monitoring
├── sov-trend/          # Share of voice trends
├── team/               # Team management
├── track/              # Link tracking
├── users/              # User management
├── video/              # Video data
├── videos/             # Videos collection
├── views/              # View tracking
├── warm/               # Warm-up system
├── workspace/          # Workspace data
└── youtube/            # YouTube API integration
```

---

## Key Files Reference

### Core Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with Providers + CampaignShell |
| `src/app/cp-layout.tsx` | Alternate bare layout (no shell) |
| `src/middleware.ts` | Route protection + role-based routing |
| `src/lib/cp-auth.ts` | JWT auth (PBKDF2 + jose) |
| `src/lib/store.ts` | Zustand global store |
| `src/lib/campaign-permissions.ts` | Role-based permissions |
| `src/components/Providers.tsx` | QueryClient + ThemeProvider |
| `src/components/CustomThemeProvider.tsx` | Light/dark theme |
| `src/app/globals.css` | Design system (CSS variables) |

### Layout Chain

```
src/app/layout.tsx
  └── Providers (QueryClientProvider + ThemeProvider)
        └── CampaignShell (sidebar + header + toast/modal providers)
              └── {children}

Exception: src/app/client/layout.tsx (separate client portal layout)
```

### State Flow

```
API Fetch → useCampaignData hook → Zustand Store → Component Re-render
                                    ↓
                              Optimistic Update → API Call → Revert on Failure
                                    ↓
                              Undo/Redo Stack
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total Pages | 35+ |
| API Route Directories | 32 |
| React Components | 37+ |
| Zustand Entities | 6 |
| Auth Roles | 5 |
| CSS Theme Variables | 50+ |
| Lib Modules | 40+ |

---

*Generated from codebase scan - August 2026*
