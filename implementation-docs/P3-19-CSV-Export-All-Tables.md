# P3-19: CSV Export on All Tables

## Current Problem
CSV export (`downloadCSV` function) exists only in `page.tsx:778-788` for the main dashboard tables. Other pages (Brand Growth, Leaderboard, Dropped Rankings, Multi-Keyword) have no export capability.

## Implementation

### Phase 1 — Create a reusable CSV export hook
```typescript
// src/lib/use-csv-export.ts
export function useCSVExport() {
  return useCallback((title: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }, [])
}
```

### Phase 2 — Add export button to each page
```typescript
// brand-growth/page.tsx
const exportCSV = useCSVExport()

<button onClick={() => exportCSV('Brand Growth', 
  ['Brand', 'Current Value', 'Growth %', 'Rank Movement'],
  brandData.map(b => [b.name, String(b.value), b.growth.toFixed(1), String(b.rankMovement)])
)}>
  Export CSV
</button>
```

### Phase 3 — Add server-side CSV generation for large datasets
For the leaderboard (100+ rows), generate CSV server-side to avoid memory issues:

```typescript
// /api/videos/leaderboard/export/route.ts
export async function GET(req: NextRequest) {
  const data = await getVideoLeaderboard(...)
  const csv = generateCSV(data.headers, data.rows)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="leaderboard.csv"',
    },
  })
}
```

## Pages to update
| Page | Table Data | Priority |
|---|---|---|
| `/leaderboard` | Top 100 videos | High (most used) |
| `/brand-growth` | Brand growth table | High |
| `/dropped` | Dropped rankings | Medium |
| `/multi-keyword` | Multi-keyword videos | Medium |
| `/brands` | Brand list + SOV | Medium |
| `/keywords` | Keyword list | Low |

## Drawbacks
1. **Large file issues** — The leaderboard with 100 rows is fine. But a full video export with 500+ rows including keyword arrays could produce large CSVs. Mitigation: server-side generation for >50 rows, client-side for smaller datasets.
2. **BOM for Excel** — CSVs with Indian numeral formats or special characters (e.g., Hindi text in titles) may not display correctly in Excel without BOM. Mitigation: add BOM `\uFEFF` at the start for Excel compatibility.
3. **Encoding issues** — YouTube titles contain emojis, non-Latin scripts. Plain CSV may corrupt these. Mitigation: always UTF-8 with BOM.

## Effort
- CSV export hook: 30 min
- Add to 3 high-priority pages: 1.5 hours
- Add to 3 medium-priority pages: 1.5 hours
- Server-side export for large datasets: 1 hour
- **Total: ~4-5 hours**
