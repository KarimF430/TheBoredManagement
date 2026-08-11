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

async function verify() {
  const tables = ['cp_product_shipments', 'cp_tracked_links', 'cp_link_clicks', 'cp_team_assignments']
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
    console.log(`${t}: ${error ? 'ERROR - ' + error.message : count + ' rows'}`)
  }

  // Test exec_sql works
  const { data, error } = await supabase.rpc('exec_sql', { _sql: "SELECT count(*) as count FROM cp_campaigns" })
  console.log(`exec_sql test: ${error ? 'ERROR - ' + error.message : JSON.stringify(data)}`)
}

verify().catch(console.error)
