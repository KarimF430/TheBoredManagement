# SOV Panel — Design Audit (Phase 1)

Audit of `sov-dashboard/` against the goal: Jira/Motion-level design quality (calm, dense-but-uncluttered, hand-crafted) with **zero** change to functionality, data logic, routing, or chart data/props.

Scope: `sov-dashboard/src/app` (21 pages), `sov-dashboard/src/components` (26 files incl. 10 tab views), `globals.css`.

---

## 1. Core finding

The design token system **already exists** in `globals.css` (header comment: *"SOV PANEL — JIRA-INSPIRED RESTRAINED DESIGN SYSTEM"`) but most pages bypass it with hardcoded inline hex. The story is: **tokens exist, adoption is broken.** The fix is migration, not invention.

Token surface available today (all verified present in `globals.css`):

- **Color:** `--accent #1A73E8`, `--accent-hover #1557B0`, `--success #22C55E`, `--warning #F59E0B`, `--danger #EF4444`, `--info #8B5CF6`, `--neutral-50…900`, plus `-dim` / `-border` / `-text` variants, `--border-1/2/3`, `--bg-elevated`, `--text-primary/secondary/muted/bright`, `--blue-gradient`, `--blue-glow`.
- **Type scale:** `--fs-micro 9px` → `--fs-display 26px` (7 steps).
- **Radii:** `--radius-xs 4px`, `-sm 6px`, `-md 8px`, `-lg 12px`, `-xl 14px`, `-full 99px`.
- **Shadows:** `--shadow-sm/md/lg` (`0 1px 2px`, `0 4px 12px`, `0 8px 24px`).
- **Spacing:** `--space-0-5 2px` → `--space-12 48px`.
- **Components:** `.card`, `.btn`, `.toggle-btn`, `.toggle-group`, `.data-table`, `.badge`, `.page-btn`, `.page-title`, `.modal-scrim`, `.modal-panel`, `.state-panel`, `.field-label`, `.toast`, `.grid-4`, `.grid-kpi`, off-canvas nav.

---

## 2. Color inventory (distinct hex values across `sov-dashboard/src`, by frequency)

### Workhorse palette (should map 1:1 to tokens)
| Hex | Uses | Token |
|---|---|---|
| `#94A3B8` | 321 | `--neutral-400` |
| `#64748B` | 289 | `--neutral-500` |
| `#0F172A` | 229 | `--neutral-900` / `--text-bright` |
| `#1A73E8` | 221 | `--accent` |
| `#F1F5F9` | 184 | `--neutral-100` / `--border-light` |
| `#E2E8F0` | 122 | `--neutral-200` / `--border-medium` |
| `#CBD5E1` | 85 | `--neutral-300` |
| `#059669` | 78 | (success-green drift, see §4) |
| `#F8FAFC` | 73 | `--neutral-50` |
| `#10B981` | 61 | (success-green drift) |
| `#475569` | 57 | `--neutral-600` / `--text-secondary` |
| `#F59E0B` | 56 | `--warning` |
| `#EF4444` | 50 | `--danger` |
| `#8B5CF6` | 50 | `--info` |
| `#FFFFFF` | 49 | `--bg-elevated` / white |
| `#7C3AED` | 42 | (violet drift, see §4) |
| `#DC2626` | 39 | `--danger-text` |
| `#334155` | 36 | `--neutral-700` |
| `#1E293B` | 36 | `--neutral-800` / `--text-primary` |

### Near-duplicate clusters (drift to reconcile, pending approval)
- **Green:** `#059669` (78), `#10B981` (61), `#22C55E` (4), `#00C853` (25), `#54A24B` (27), `#34D399` (8), `#16A34A` (1), `#00875A` (1), `#047857` (1)
- **Red/pink:** `#EF4444` (50), `#FF2D55` (13), `#FF4444` (2), `#F04759` (1), `#E91E63` (1), `#DE350B` (1), `#FF9DA6` (15), `#F87171` (4), `#FF0000` (4)
- **Orange:** `#F58220` (32), `#FF6D00` (15), `#F58518` (12), `#FF9F43` (10), `#F97316` (2), `#EA580C` (1), `#F59E0B` (56, canonical), `#FBBF24` (1), `#D97706` (21)
- **Violet/indigo:** `#8B5CF6` (50, canonical), `#7C3AED` (42), `#6D28D9` (1), `#A855F7` (1), `#9B72F5` (2), `#6366F1` (6), `#312E81` (3), `#4338CA` (3), `#1D4ED8` (3), `#4C9AFF` (4), `#79B8FF` (8), `#3B82F6` (5), `#38BDF8` (6), `#06B6D4` (10)
- **Neutral off-blues:** `#42526E`, `#172B4D`, `#6B778C`, `#DFE1E6`, `#97A0AF`, `#E8EDF3` (1× each — Jira heritage colors leaking into the codebase)

### One-offs to eliminate (3–2–1 use)
`#F0FDF4`, `#F0F4FF`, `#FAFBFF`, `#F1F5FF`, `#FEF3C7`, `#D1FAE5`, `#FDE68A`, `#FFF8F0`, `#FFF7ED`, `#FFF5F5`, `#F5F3FF`, `#F3E8FF`, `#EDE9FE`, `#F0F7FF`, `#F9FAFB`, `#FAFAFA`, `#FCFCFC`, `#DBEAFE`, `#BFDBFE`, `#E0F2FE`, `#FECACA`, `#FEF2F2`, `#ECFDF5`, `#DCFCE7`, `#A7F3D0`, `#F4F5F7`, `#F4A582`, `#FFFFB3`, `#C2740A`, `#974F0C`, `#92400E`, `#B45309`, `#B91C1C`, `#991B1B`, `#7F1D1D`, `#065F46`, `#064E3B`, `#15803D`, `#0369A1`, `#1E3A8A`, `#4285F4`, `#4F9CF9`, `#E6781C`, `#0A0F1A`, `#06C9D7`

### Brand palette (in `src/lib/brand-colors.ts` — DATA-DERIVED, DO NOT TOUCH)
`#4C78A8`, `#E45756`, `#B279A2`, `#F58518`… Chart series colors for brands are generated here. Changing these changes chart rendering for brands → treated as functionality, excluded from restyle.

---

## 3. Radius / shadow / type drift

- **Radii:** no single scale in use — `4/6/8/10/12/14/16/18/20/50/99`px and `16px` modal corners all coexist, plus `2px` micro-radii. The token scale (`xs 4 / sm 6 / md 8 / lg 12 / xl 14 / full 99`) covers everything.
- **Shadows:** 30+ distinct inline shadows (e.g. `0 1px 3px rgba(0,0,0,0.02)` ×17, `0 4px 24px rgba(0,0,0,0.3)` ×11, `0 8px 32px rgba(0,0,0,0.35)`, `0 20px 60px rgba(0,0,0,0.15)`). Replace with `--shadow-sm/md/lg` + a single modal shadow token.
- **Type:** sizes inline as `9…13px` numbers + some literal `12.5`/`11.5`. Migrate to `--fs-*`. One `'JetBrains Mono',monospace` family used for chart tooltips/numbers → candidate for a `--font-mono` token.

---

## 4. KPI / status color drift (business-visual, needs design decision)

Same semantic → different hex across components:
- Success: `#059669`, `#10B981`, `#00C853`, `#22C55E`
- Danger: `#EF4444`, `#FF2D55`, `#FF4444`
- Info/violet: `#8B5CF6`, `#7C3AED`

These are visual-semantic, not data-driven — can be unified to `--success`/`--danger`/`--info` **with approval**, since it changes on-screen color.

---

## 5. Token adoption per page

Sorted by hardcoded-vs-token ratio (hex / `var()`):
```
keyword-sov      145 / 0
client           137 / 1
page (overview)   99 / 0
sov-trend         89 / 0
settings          87 / 0
analytic-calendar 80 / 0
control           79 / 32
pending-tagging   79 / 0
brand-growth      70 / 0
channel/[name]    70 / 0
workspace         68 / 34
video/[id]        60 / 0
leaderboard       47 / 13
brands/[brandName]45 / 0
brands            38 / 18
multi-keyword     29 / 2
dropped           26 / 2
brands-products   23 / 0
login             16 / 0
privacy-policy    12 / 49
videos            10 / 7
keywords           0 / 0  (re-exports/uses shared components)
```
Leaders: `privacy-policy`, `workspace`, `control`, `brands`, `leaderboard` (partial). Worst offenders: `keyword-sov`, `client`, `overview`, `sov-trend`, `settings`.

---

## 6. Cross-cutting issues (verified)

1. **Tooltip convention:** recharts `contentStyle` hardcoded dark `#0F172A` bg everywhere except `CreatorsTab` (uses `var(--text-bright)`). Unify to a single token.
2. **Orphaned classes:** `.row-hover` and `.demo-banner` referenced in JSX but **not defined** in `globals.css`.
3. **Hover/focus gaps:** modal close ✕ buttons, language/type chips in `Header`, various clickable rows — missing `:hover`/`:focus-visible`. (a11y attrs are present elsewhere; focus styles need adding, not removing.)
4. **Empty/loading/error states:** several pages render bare text or nothing for these; `PageSkeleton` exists but not used everywhere. Pages/components needing designed empty/loading/error states — see §8.
5. **Numeric typography:** values set in `'JetBrains Mono',monospace` or regular fonts inconsistently → apply tabular numerals + mono to ALL numeric content.
6. **Data bug (flag only, NOT fixing):** `OverviewTab` ~L290 — `dateRange === '48h'` branch reuses `overview?.growth?.h24` value. This is data logic; out of scope, surfaced for the user.
7. **Motion:** transitions are ad-hoc (`all 0.15s`, `0.2s`, cubic-bezier variants). Needs 2–3 approved duration/easing tokens.

---

## 7. Chart stack

- **No echarts.** Recharts for most charts; pure CSS/SVG bars on several pages; custom SVG `IndiaMap`.
- Restyle only (tooltip, axis tick colors, grid stroke, cursor fill); **never** touch data arrays, formatter logic, or library props.

---

## 8. Pages & components grouped into implementation batches

Batch order = worst-adoption first, then shared primitives, then polish.

**Batch 1 — Dashboard core (4):** `page.tsx` (overview), `client/page.tsx`, `keyword-sov/page.tsx`, `settings/page.tsx`
**Batch 2 — Analytics (4):** `sov-trend/page.tsx`, `analytic-calendar/page.tsx`, `brand-growth/page.tsx`, `multi-keyword/page.tsx`
**Batch 3 — Tables & lists (5):** `leaderboard/page.tsx`, `pending-tagging/page.tsx`, `video/[id]/page.tsx`, `brands/page.tsx`, `brands/[brandName]/page.tsx`
**Batch 4 — Auxiliary (4):** `workspace/page.tsx`, `control/page.tsx`, `channel/[name]/page.tsx`, `brands-products/page.tsx`
**Batch 5 — Light touch (4):** `dropped/page.tsx`, `videos/page.tsx`, `keywords/page.tsx`, `privacy-policy/page.tsx`, `login/page.tsx`

**Shared primitives (before/with batches):** `AppShell`, `Header`, `Sidebar`, `ClientSidebar`, `SharedFilterBar`, `PageSkeleton`, `AnalysisProgress`, `IndiaMap`, `CreatorIntelligenceModal`, `WelcomeModal`/`TutorialOverlay`.

**Tab views (part of dashboard pages):** `OverviewTab`, `CreatorsTab`, `VideosTab`, `KeywordsTab`, `RankingsTab`, `BrandsTab`, `GrowthTab`, `TrendsTab`, `AlertsTab`, `SettingsTab`.

---

## 9. Missing-state matrix

| Surface | Empty | Loading | Error |
|---|---|---|---|
| overview / OverviewTab | ✗ bare | skeleton partial | ✗ |
| keyword-sov | partial | skeleton partial | ✗ |
| sov-trend | ✗ | skeleton partial | ✗ |
| leaderboard | ✗ | skeleton partial | ✗ |
| control | ✗ | skeleton partial | ✗ |
| workspace | ✗ | skeleton partial | ✗ |
| client | ✗ | skeleton partial | ✗ |
| settings | ✗ | skeleton partial | ✗ |
| analytic-calendar | ✗ | ✗ | ✗ |
| brand-growth | ✗ | ✗ | ✗ |
| multi-keyword | ✗ | ✗ | ✗ |
| pending-tagging | ✗ | ✗ | ✗ |
| dropped | ✗ | ✗ | ✗ |
| brands, brands-products, videos, brands/[brandName], channel/[name], privacy-policy | ✗ | ✗ | ✗ |
| tabs (all) | inconsistent | ✗ | ✗ |

(`PageSkeleton` exists and is the designated pattern — apply consistently; build shared `EmptyState`/`ErrorState` components once.)

---

## 10. What this phase does NOT touch

- API calls, data fetching, chart data/props/library calls, routing, state management, validation/business logic.
- `brand-colors.ts` palette (data-derived brand colors = chart rendering).
- The `OverviewTab` h24/48h data bug (flagged only).
- Login page (already redesigned to Jira-style on master).
