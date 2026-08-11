# SOV Panel — Design System Proposal (Phase 2)

Builds directly on `sov-dashboard/src/app/globals.css`, which already contains a mature, Jira-inspired token system (its header literally reads *"SOV PANEL — JIRA-INSPIRED RESTRAINED DESIGN SYSTEM"*). **The existing tokens are authoritative.** Phase 2 fills the gaps the audit found and locks the reconciliation rules for migrating every page onto the tokens.

All changes are presentational. No API, data, routing, state, chart-data, or business logic is touched.

---

## 1. Principles

1. **Tokens win.** Every hardcoded value in a page/component maps to a token in `globals.css` before the batch ships. No new hex, font-size, radius, or shadow enters the codebase.
2. **Calm density.** Information-dense but restrained: 1px borders, minimal shadows, muted neutrals, one accent doing one job. Hierarchy from size+weight+color moving together (already the system's rule).
3. **Hand-crafted.** Consistent radii per component type, consistent 8px spacing rhythm, tabular numerals on every comparable number, motion from 3 duration + 3 easing tokens only.
4. **One color, one meaning.** Drift is reconciled to the semantic scale (see §4) — a green badge and a green KPI delta read the same.
5. **Reskin only.** Charts, tables, cards get visual treatment; their props, data arrays, and interactions are never edited.

---

## 2. Authoritative token set (already in globals.css — keep as-is)

These are confirmed present and correct. Implementation batches only *consume* them; this section is not changed:

- **Semantic colors:** `--accent #1A73E8` / `-hover` / `-dim` / `-border`, `--success #22C55E`, `--warning #F59E0B`, `--danger #EF4444`, `--info #8B5CF6`, each with `-text` / `-dim` / `-border` variants, `--on-accent`.
- **Neutrals:** `--neutral-50…#900` (10 steps), surfaces `--bg-base/-surface/-card/-elevated/-hover/-input`, borders `--border-light/-medium/-strong`.
- **Shadows:** `--shadow-sm/md/lg`.
- **Radii:** `--radius-xs 4 / sm 6 / md 8 / lg 12 / xl 14 / full 99` with the documented component-type assignment (xs/sm dense controls; md inputs/toggles; lg cards/charts; xl summaries/modals).
- **Type:** `--fs-micro 9 → display 26` (9 steps), `--lh-*`, `--fw-*`.
- **Spacing:** `--space-0-5 2 … space-12 48` (8px base).
- **Motion:** `--duration-fast 120 / normal 180 / slow 320`, `--ease-out/in/in-out`.
- **Chart palette:** `--c1…#c15` (mirrors `src/lib/brand-colors.ts`), plus `--brand-youtube`, `--brand-amazon`.
- **Component classes:** `.card`, `.card-interactive`, `.kpi-card`/`-value`/`-label`/`-sub`/`-icon-wrap`, `.btn`(+blue/ghost/danger/sm/xs), `.toggle-group`/`.toggle-btn`(+compact), `.filter-bar`/`.filter-count`, `.badge`(+7 colors), `.data-table`, `.rank-num`, `.input`, `.sov-bar-track/-fill`, `.pagination`/`.page-btn`, `.chip`, `.chart-container`/`.chart-title`, `.tooltip-box`, `.delta-pos/-neg`, `.t-display…t-micro`, `.mono`, `.num`, `.scroll-x`, `.table-wrap`, `.state-panel`(+`--error`), recharts reskin block, `.modal-scrim/-panel/-title/-subtitle/-close/-actions/-grid-2`, `.field-label`, `.choice`, `.toast`(+success/error), `.nav-scrim`/`.nav-toggle`, `.skip-link`, `.grid-2/3/4/-kpi`, `.kpi-grid(-row2/-row2-1)`, responsive breakpoints at 1366/1100/840/640/900px.
- **Global:** `:focus-visible` ring, `prefers-reduced-motion`, thin scrollbars.

---

## 3. Gaps to fill (new additions — all in globals.css unless noted)

| # | Addition | Why | Value |
|---|---|---|---|
| G1 | `--font-sans`, `--font-mono` tokens | Font families are hardcoded inline today | `--font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;` `--font-mono: 'JetBrains Mono', monospace;` |
| G2 | `--shadow-modal` | Modal shadows are 30+ ad-hoc variants | `0 20px 60px rgba(15,23,42,0.18)` |
| G3 | `--tooltip-bg` (+ `--tooltip-text`) | Chart tooltips hardcode `#0F172A` | `--tooltip-bg: #0F172A; --tooltip-text: #F8FAFC;` |
| G4 | `.row-hover` class | Orphaned — only inline on `page.tsx:309`; used by 15+ surfaces | Card/row hover: `background: var(--bg-hover);` + `transition: background var(--duration-fast) var(--ease-out);` (define once in globals.css, delete the inline def) |
| G5 | `.demo-banner` class | Orphaned — referenced (channel/[name], video/[id]) but never defined | Restrained demo strip: `background: var(--accent-dim); border: 1px solid var(--accent-border); color: var(--accent); border-radius: var(--radius-md); padding: var(--space-2) var(--space-4);` |
| G6 | `.skeleton-line` shimmer | `@keyframes shimmer` exists, no class uses it; `PageSkeleton` uses flat grey bars | `background: linear-gradient(90deg, var(--neutral-100) 25%, var(--neutral-50) 50%, var(--neutral-100) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--radius-sm);` |
| G7 | Shared React components `EmptyState` / `ErrorState` / `LoadingState` | State matrix (§9 of audit) is mostly missing; `.state-panel` + `PageSkeleton` are the designated pattern but unused in most pages | Thin wrappers around existing classes — one icon + title + body + optional actions. New file(s) in `src/components/` |
| G8 | `.tooltip-box` variants (`--dark`) | Chart tooltips use inline `#0F172A`; unify | `.tooltip-box.tooltip-box--dark { background: var(--tooltip-bg); color: var(--tooltip-text); border-color: transparent; }` |
| G9 | `.num` coverage | Tabular-numeral rule exists but pages use `fontFamily: "'JetBrains Mono',monospace"` inline | Use `.num`/`.mono` in JSX; `font-variant-numeric` already applies to KPI/table/delta/badge/chip/pagination/axis ticks |

---

## 4. Color reconciliation decision table — **REQUIRES YOUR SIGN-OFF**

This changes on-screen colors and is the only part of the proposal that does. Recommended default shown first; veto any row and I'll keep that cluster as a registered token instead.

| Drift cluster (uses) | Canonical target | Notes |
|---|---|---|
| Green: `#059669` (78), `#10B981` (61), `#00C853` (25), `#54A24B` (27)*, `#34D399` (8), `#16A34A`, `#00875A`, `#047857` | `--success #22C55E` for fills/bars; `--success-text #15803D` when colour carries words | *`#54A24B` is also chart series `--c2` — **kept as `--c2` in chart contexts only** |
| Red/pink: `#EF4444` (50) ✓, `#FF2D55` (13), `#FF4444` (2), `#F04759`, `#E91E63`, `#DE350B`, `#FF0000`*, `#F87171` (4), `#FF9DA6` (15)* | `--danger #EF4444` fills; `--danger-text #B91C1C` text | *`#FF0000` = `--brand-youtube` (kept for YouTube mark only); `#FF9DA6` = chart series `--c7` (kept in charts) |
| Orange: `#F58220` (32)*, `#FF6D00` (15), `#F58518` (12)*, `#FF9F43` (10), `#F97316`, `#EA580C`, `#D97706` (21), `#FBBF24` | `--warning #F59E0B` fills; `--warning-text #B45309` text | *`#F58220` = `--brand-amazon` (kept for Amazon mark); `#F58518` = chart series `--c11` (kept in charts) |
| Violet/indigo: `#8B5CF6` (50) ✓, `#7C3AED` (42), `#6D28D9`, `#A855F7`, `#9B72F5`, `#6366F1`, `#312E81`, `#4338CA`, `#1D4ED8`, `#4C9AFF` (4), `#79B8FF` (8)*, `#3B82F6`, `#38BDF8` (6), `#06B6D4` (10)* | `--info #8B5CF6` | *`#79B8FF` = `--c12`, `#06B6D4` = chart accent — chart contexts only |
| Neutral off-blues: `#42526E`, `#172B4D`, `#6B778C`, `#DFE1E6`, `#97A0AF`, `#E8EDF3` (1× each) | Nearest `--neutral-*` (600/900/500/200/400/100) | Jira heritage hexes leaking in |
| `#FFFFFF` (49) | `--surface` / `--bg-card` | Card/surface backgrounds |
| One-offs (50 shades, 1–3× each) | Nearest token, judged per occurrence during batches | Rule: **no value ships unmapped** |

Result after approval: the only hex values that may appear in JSX are brand marks (`--brand-youtube`, `--brand-amazon`) and data-driven chart series from `brand-colors.ts` (which stay as-is — that file is excluded).

---

## 5. Chart reskin rules (presentation only)

1. Series colors = `--c1…#c15` / `brand-colors.ts`. **Never edited.**
2. Tooltip `contentStyle` → `tooltip-box tooltip-box--dark` (one token, replaces 15+ inline `#0F172A` copies).
3. Grid/axis/cursor/legend: already reskinned globally via the `.recharts-*` block in globals.css — no per-chart styling needed.
4. Numeric axis ticks already get tabular numerals from the `.recharts-cartesian-axis-tick-value` rule.
5. No `data=`, `formatter=`, or library prop changes.

---

## 6. Component recipes (single source per component type)

| Component type | Radius | Padding | Border | Shadow |
|---|---|---|---|---|
| Cards / chart containers | `--radius-lg` | `20px` (16px ≤1366) | `1px --border-light` | `--shadow-sm` |
| KPI cards | `--radius-lg` | `16px 20px` | `1px --border-light` | `--shadow-sm` |
| Dense controls (chips, pagination, small buttons) | `--radius-xs/sm` | `--space-1..2` | `1px --border-medium` | none |
| Inputs / toggles / popovers | `--radius-sm/md` | `8px 14px` | `1px --border-medium` | focus ring `3px --accent-dim` |
| Modals / summary panels | `--radius-xl` | `--space-6` | `1px --border-medium` | `--shadow-modal` |
| Table rows (clickable) | `--radius-sm` | `10px 14px` | bottom `1px --border-light` | hover `--bg-hover` |

---

## 7. Motion rules

- Only `--duration-fast/normal/slow` × `--ease-out/in/in-out` combinations. No literal `0.15s`/`0.2s`/ad-hoc bezier.
- `prefers-reduced-motion` global block already neutralises everything.

---

## 8. Responsive & accessibility invariants

- **Responsive breakpoints untouched** (existing 1366/1100/840/640/900px + `html{zoom:.8}` logic stays exactly as-is).
- **a11y attributes preserved** — nothing added to them either; we only add `:hover`/`:focus-visible` feedback where clickables currently have none (modal ✕, Header language/type chips, clickable rows).
- Global `:focus-visible` ring already covers keyboard users.

---

## 9. Batch plan (implementation order — from AUDIT §8)

1. **Shared primitives first:** globals.css additions (G1–G9), `EmptyState`/`ErrorState`/`LoadingState`, delete inline `.row-hover` in `page.tsx`, then `AppShell`, `Header`, `Sidebar`, `ClientSidebar`, `SharedFilterBar`, `PageSkeleton`.
2. **Batch 1 — Dashboard core:** `page.tsx`, `client`, `keyword-sov`, `settings`.
3. **Batch 2 — Analytics:** `sov-trend`, `analytic-calendar`, `brand-growth`, `multi-keyword`.
4. **Batch 3 — Tables & lists:** `leaderboard`, `pending-tagging`, `video/[id]`, `brands`, `brands/[brandName]`.
5. **Batch 4 — Auxiliary:** `workspace`, `control`, `channel/[name]`, `brands-products`.
6. **Batch 5 — Light touch:** `dropped`, `videos`, `keywords`, `privacy-policy`, `login`.
7. Tab views restyled as part of their hosting page.

Each batch commits locally; visual review happens at the end of each batch; **no pushes** until you approve the whole run.

---

## 10. Explicitly out of scope

- `src/lib/brand-colors.ts` (data-derived brand palette).
- `OverviewTab` `48h`/`h24` data bug (flagged in AUDIT §6.6).
- Any API, fetch, chart data/prop, routing, state, validation change.
- The existing responsive breakpoints and `zoom` logic.
