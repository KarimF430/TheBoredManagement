# P4: Polish & UX Improvements (Items 21-25)

## P4-21: Keyboard Shortcuts

Add a keyboard shortcut system for power users.

### Implementation
```typescript
// src/lib/use-keyboard-shortcuts.ts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const key = `${e.metaKey ? 'Cmd+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`
      if (shortcuts[key]) {
        e.preventDefault()
        shortcuts[key]()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
```

### Shortcuts
| Key | Action |
|---|---|
| `g o` | Go to Overview |
| `g b` | Go to Brand SOV |
| `g c` | Go to Creators |
| `g r` | Go to Rankings |
| `g v` | Go to Videos |
| `g k` | Go to Keywords |
| `r` | Refresh current view |
| `/` | Focus search on current tab |
| `?` | Show keyboard shortcuts help overlay |

### Drawbacks
- Conflicts with browser shortcuts (Cmd+R, Ctrl+R)
- Not discoverable without a help overlay
- g + letter sequences require a keydown timeout implementation

### Effort: 1 day

---

## P4-22: Dashboard Export as PDF

Generate a one-click PDF report of the current dashboard view.

### Implementation
Use `html2canvas` + `jsPDF` to capture dashboard sections as a PDF:

```typescript
// src/lib/export-pdf.ts
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportDashboardPDF(campaignName: string) {
  const pdf = new jsPDF('landscape', 'mm', 'a4')
  const sections = document.querySelectorAll('.dashboard-section')
  
  for (const section of sections) {
    const canvas = await html2canvas(section as HTMLElement)
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 10, 10, 277, 190)
    pdf.addPage()
  }
  
  pdf.save(`${campaignName}_report.pdf`)
}
```

### Export options
- Current tab only (focused report)
- All tabs (full report, 15+ pages)
- Selected sections (user checks boxes)

### Drawbacks
- `html2canvas` adds ~40KB to JS bundle
- Complex charts (scatter, radar) may not render correctly in canvas
- Recharts SVG rendering is inconsistent with canvas capture
- Multi-page PDF with mixed portrait/landscape sections is challenging
- Styling differences between screen and print

### Effort: 2 days

---

## P4-23: Dark Mode

The `next-themes` package is already installed and `ThemeProvider` is in `Providers.tsx`. CSS custom properties for colors exist in `globals.css`. Just need to wire it together.

### Files to change
1. **Add theme toggle** in Header or Sidebar:
```typescript
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
</button>
```

2. **Add dark mode CSS** — Since the main dashboard uses inline styles, dark mode requires a different approach:
   - Option A: Define CSS variables in globals.css and use `var(--color-bg)` in inline styles
   - Option B: Use a `useDarkMode()` hook that returns color values based on theme

3. **Create a design tokens file**:
```typescript
// src/lib/tokens.ts
export function useTokens() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return {
    background: isDark ? '#0F172A' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#0F172A',
    muted: isDark ? '#64748B' : '#94A3B8',
    border: isDark ? '#1E293B' : '#F1F5F9',
    cardBg: isDark ? '#1E293B' : '#FFFFFF',
  }
}
```

### Drawbacks
- Converting 2332 lines of inline styles to theme-aware tokens is the **same scope as P1-04** (decomposition). Doing it before decomposition means changing every style twice.
- CSS variable approach (Option A) has poor performance for frequently-updated colors
- Most components use hardcoded hex colors — cannot be overridden by CSS variables
- **Recommendation:** Defer dark mode until after the mega-component is decomposed

### Effort: 1 day (after decomposition) / 3 days (with current structure)

---

## P4-24: Mobile-Responsive Layout

### Current state
- Sidebar is fixed at 220px — no mobile behavior
- Grid layouts use `repeat(6, 1fr)` — doesn't stack on mobile
- No breakpoint handling

### Implementation
```css
/* globals.css — add responsive rules */
@media (max-width: 1024px) {
  .app-shell {
    grid-template-columns: 1fr;  /* Full-width content */
  }
  .sidebar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 56px; flex-direction: row; z-index: 100;
  }
}

@media (max-width: 768px) {
  /* Metric cards: 6 columns → 2 columns */
  .metric-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  /* Hide detailed sidebar labels, show icons only */
  .sidebar-label { display: none; }
}
```

### Key changes
1. Sidebar → bottom nav bar on mobile (icons only)
2. Multi-column grids → 2-column or single-column
3. Charts: responsive via `ResponsiveContainer` (already implemented)
4. Tables: horizontal scroll wrapper
5. Header: collapse campaign selector into hamburger menu

### Drawbacks
- The inline style grid (`gridTemplateColumns: 'repeat(6, 1fr)'`) cannot be overridden by media queries. Must change to CSS class-based grids.
- Complex charts (scatter plot with tooltip, radar chart) are unusable on small screens
- Tabs overflow on narrow screens — they already have `overflowX: auto` (line 844)
- Mobile UX for the India map is poor (hover doesn't work on touch)

### Effort: 3-4 days (significant CSS refactor)

---

## P4-25: Command Palette (Cmd+K)

Quick-search for brands, videos, channels, keywords without navigating through tabs.

### Implementation
```typescript
// src/components/CommandPalette.tsx
import { useState, useEffect, useRef } from 'react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  onSelect: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommandItem[]>([])
  
  // Cmd+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Search logic — mix of local and API results
  // ...
  
  return open ? (
    <div className="command-palette-overlay">
      <input value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Search brands, videos, channels..." />
      <div className="results">
        {results.map(item => (
          <div key={item.id} onClick={item.onSelect}>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  ) : null
}
```

### Drawbacks
- Requires debounced search API endpoint or in-memory search over the video/keyword list
- Video search needs to query Supabase (not client-side)
- Could be confused with browser Cmd+K (which focuses URL bar)
- Adds another keyboard shortcut that may conflict with P4-21

### Effort: 2 days
