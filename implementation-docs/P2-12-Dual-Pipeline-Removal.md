# P2-12: Remove SQLite Pipeline (Single Pipeline Commitment)

## Current Problem
The codebase maintains **two parallel scraping pipelines**:
- `src/lib/scrape-pipeline.ts` (668 lines) — SQLite-based
- `src/lib/scrape-pipeline-pg.ts` (979 lines) — PostgreSQL/Supabase-based

Also maintains two database clients:
- `src/lib/db.ts` (216 lines) — SQLite `better-sqlite3`
- `src/lib/supabase.ts` (958 lines) — Supabase PostgreSQL

This doubles the bug surface, increases bundle size, and every schema change must be applied twice. The SQLite pipeline is no longer used in production.

## Implementation

### Phase 1 — Audit usage of SQLite pipeline
Search for imports of `scrape-pipeline.ts` and `db.ts`:
```
rg "from '@/lib/scrape-pipeline'" --no-heading
rg "from '@/lib/db'" --no-heading
rg "getDb\(\)" --no-heading
rg "better-sqlite3" --no-heading
```

Current imports likely:
- `worker.ts` — switch to PG pipeline
- `scrape-pipeline.ts` — remove
- Any remaining API routes — switch to PG

### Phase 2 — Remove files
```bash
rm src/lib/scrape-pipeline.ts
rm src/lib/db.ts
rm data/sov.db data/sov.db-shm data/sov.db-wal  # SQLite data files
rm -rf node_modules/better-sqlite3 @types/better-sqlite3
```

### Phase 3 — Update package.json
```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

### Phase 4 — Update next.config.ts
```typescript
// Remove: serverExternalPackages: ['better-sqlite3']
export default {
  compress: true,
  // serverExternalPackages removed
}
```

### Phase 5 — Rename PG pipeline (optional)
```bash
# Move to clean name since there's no more ambiguity
mv src/lib/scrape-pipeline-pg.ts src/lib/scrape-pipeline.ts
```

## Files Removed/Changed
| File | Action |
|---|---|
| `src/lib/scrape-pipeline.ts` | Delete |
| `src/lib/db.ts` | Delete |
| `data/sov.db` | Delete (not tracked in git) |
| `data/sov.db-shm` | Delete |
| `data/sov.db-wal` | Delete |
| `src/lib/scrape-pipeline-pg.ts` | Rename to `scrape-pipeline.ts` |
| `src/lib/worker.ts` | Update import path |
| `src/lib/worker-startup.ts` | Update import path if needed |
| `next.config.ts` | Remove `serverExternalPackages` |
| `package.json` | Remove `better-sqlite3`, `@types/better-sqlite3` |

## Drawbacks
1. **No local development without Supabase** — Currently, SQLite allows running the full stack locally without a Supabase account. After removal, developers need Supabase credentials to develop. Mitigation: ensure `.env.example` has clear Supabase setup instructions, or provide a `docker-compose.yml` with PostgreSQL.
2. **Migration risk** — If the PG pipeline has any bugs not present in the SQLite pipeline, there's no fallback. Mitigation: the PG pipeline has been in production use (this is a cleanup of dead code).
3. **Renaming introduces churn** — Renaming `scrape-pipeline-pg.ts` → `scrape-pipeline.ts` will create a large git diff and potentially break PR branches. Mitigation: delete the old file, rename the new one, but update imports in a separate commit.
4. **No git history for removed files** — If the SQLite pipeline is needed for reference later, git history preserves it. No data loss.

## Effort
- Audit imports: 30 min
- Remove files + update imports: 1 hour
- Update npm packages: 10 min
- Test scraping flow: 1 hour
- **Total: ~2-3 hours**

## Verification
- Run a keyword scrape — it uses the PG pipeline
- All worker jobs complete successfully
- Build succeeds without `better-sqlite3`
- `npm test` still passes
