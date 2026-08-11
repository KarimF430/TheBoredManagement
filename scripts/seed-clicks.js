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

const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
]
const DEVICES = ['mobile', 'mobile', 'mobile', 'desktop', 'desktop', 'tablet']
const BROWSERS = ['Safari', 'Chrome', 'Chrome', 'Firefox', 'Samsung Internet']
const COUNTRIES = ['IN', 'IN', 'IN', 'IN', 'US', 'AE', 'GB', 'SG']

async function seedClicks() {
  const { data: links } = await supabase.from('cp_tracked_links').select('id, clicks')
  if (!links?.length) { console.log('No links found'); return }

  console.log(`Seeding clicks for ${links.length} links...`)
  const allClicks = []

  for (const link of links) {
    const numClicks = Math.min(link.clicks || 0, 15)
    for (let j = 0; j < numClicks; j++) {
      allClicks.push({
        link_id: link.id,
        ip_address: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        device: DEVICES[Math.floor(Math.random() * DEVICES.length)],
        browser: BROWSERS[Math.floor(Math.random() * BROWSERS.length)],
        country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
        clicked_at: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
      })
    }
  }

  // Batch insert
  for (let i = 0; i < allClicks.length; i += 500) {
    const batch = allClicks.slice(i, i + 500)
    const { error } = await supabase.from('cp_link_clicks').insert(batch)
    if (error) { console.error(`Batch ${i}:`, error.message); break }
  }

  console.log(`Inserted ${allClicks.length} clicks across ${links.length} links`)
}

seedClicks().catch(console.error)
