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

async function seed() {
  // Get existing campaigns, creators, deliverables
  const { data: campaigns } = await supabase.from('cp_campaigns').select('id, name')
  const { data: creators } = await supabase.from('cp_creators').select('id')
  const { data: deliverables } = await supabase.from('cp_deliverables').select('id, campaign_id')

  if (!campaigns?.length || !creators?.length || !deliverables?.length) {
    console.error('Missing base data. Run seed-campaign-data.js first.')
    process.exit(1)
  }

  console.log(`Found ${campaigns.length} campaigns, ${creators.length} creators, ${deliverables.length} deliverables`)

  // Seed product shipments
  const shipments = []
  for (const d of deliverables.slice(0, 20)) {
    const statuses = ['pending', 'shipped', 'in_transit', 'delivered']
    shipments.push({
      deliverable_id: d.id,
      campaign_id: d.campaign_id,
      product_name: ['Aquaguard Smart', 'boAt Airdopes', 'Mamaearth Kit', 'Zomato Voucher', 'Samsung Galaxy'][Math.floor(Math.random() * 5)],
      tracking_number: `TRK${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      carrier: ['BlueDart', 'Delhivery', 'DTDC', 'FedEx'][Math.floor(Math.random() * 4)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      shipped_at: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
      estimated_delivery: new Date(Date.now() + Math.random() * 7 * 86400000).toISOString().split('T')[0],
      notes: ''
    })
  }

  const { error: e1 } = await supabase.from('cp_product_shipments').insert(shipments)
  console.log(`Shipments: ${e1 ? 'ERROR - ' + e1.message : shipments.length + ' inserted'}`)

  // Seed tracked links
  const links = []
  const codes = ['ag01', 'bo01', 'mm01', 'zt01', 'ss01', 'ag02', 'bo02', 'mm02', 'zt02', 'ss02',
                 'ag03', 'bo03', 'mm03', 'zt03', 'ss03', 'ag04', 'bo04', 'mm04', 'zt04', 'ss04']
  for (let i = 0; i < 20; i++) {
    const d = deliverables[i]
    const c = creators[i % creators.length]
    const camp = campaigns.find(camp => camp.id === d.campaign_id) || campaigns[0]
    links.push({
      campaign_id: d.campaign_id,
      creator_id: c.id,
      deliverable_id: d.id,
      original_url: `https://amazon.in/dp/B${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      short_code: codes[i],
      short_url: `https://tbm.link/${codes[i]}`,
      tracked_url: `https://amazon.in/dp/B${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}?utm_source=influencer&utm_medium=youtube&utm_campaign=${camp.name.toLowerCase().replace(/\s+/g, '-')}`,
      utm_source: 'influencer',
      utm_medium: 'youtube',
      utm_campaign: camp.name.toLowerCase().replace(/\s+/g, '-'),
      utm_content: `creator_${i + 1}`,
      clicks: Math.floor(Math.random() * 500),
      unique_clicks: Math.floor(Math.random() * 300),
      conversions: Math.floor(Math.random() * 50),
      last_clicked_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString()
    })
  }

  const { error: e2 } = await supabase.from('cp_tracked_links').insert(links)
  console.log(`Tracked links: ${e2 ? 'ERROR - ' + e2.message : links.length + ' inserted'}`)

  // Seed link clicks
  const clicks = []
  for (const link of links) {
    const numClicks = Math.min(link.clicks, 5)
    for (let j = 0; j < numClicks; j++) {
      clicks.push({
        link_id: link.id,
        ip_address: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: ['Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)', 'Mozilla/5.0 (Linux; Android 13)', 'Mozilla/5.0 (Windows NT 10.0)'][Math.floor(Math.random() * 3)],
        device: ['mobile', 'mobile', 'desktop'][Math.floor(Math.random() * 3)],
        browser: ['Safari', 'Chrome', 'Firefox'][Math.floor(Math.random() * 3)],
        country: ['IN', 'IN', 'IN', 'US', 'AE'][Math.floor(Math.random() * 5)],
        clicked_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString()
      })
    }
  }

  // Batch insert clicks (max 500 at a time)
  for (let i = 0; i < clicks.length; i += 500) {
    const batch = clicks.slice(i, i + 500)
    const { error } = await supabase.from('cp_link_clicks').insert(batch)
    if (error) { console.error(`Clicks batch ${i}:`, error.message); break }
  }
  console.log(`Link clicks: ${clicks.length} inserted`)

  // Seed team assignments
  const teamUsers = [
    { id: '00000000-0000-0000-0000-000000000001', role: 'brand_solutions', sections: ['overview', 'report'] },
    { id: '00000000-0000-0000-0000-000000000002', role: 'campaign_manager', sections: ['brief', 'shortlist', 'content', 'tracking'] },
    { id: '00000000-0000-0000-0000-000000000003', role: 'ir_executive', sections: ['shortlist', 'content'] },
  ]

  const assignments = []
  for (const camp of campaigns) {
    for (const u of teamUsers) {
      assignments.push({
        campaign_id: camp.id,
        user_id: u.id,
        role: u.role,
        assigned_sections: u.sections
      })
    }
  }

  const { error: e4 } = await supabase.from('cp_team_assignments').insert(assignments)
  console.log(`Team assignments: ${e4 ? 'ERROR - ' + e4.message : assignments.length + ' inserted'}`)

  console.log('\nPhase 2 seed complete!')
}

seed().catch(console.error)
