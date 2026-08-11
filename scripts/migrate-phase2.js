import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrate() {
  const sqlPath = join(process.cwd(), 'schema', '002_phase2_features.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  console.log('Running Phase 2 migration via exec_sql...')
  const { data, error } = await supabase.rpc('exec_sql', { _sql: sql })

  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  console.log('Migration result:', data)
  console.log('Phase 2 migration complete!')

  // Verify tables exist
  const tables = ['cp_product_shipments', 'cp_tracked_links', 'cp_link_clicks', 'cp_team_assignments']
  for (const t of tables) {
    const { count, error: e } = await supabase.from(t).select('*', { count: 'exact', head: true })
    console.log(`${t}: ${e ? 'ERROR - ' + e.message : count + ' rows'}`)
  }
}

migrate().catch(console.error)
