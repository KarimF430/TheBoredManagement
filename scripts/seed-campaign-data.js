/**
 * Campaign Panel — Comprehensive Seed Data
 * Run: node scripts/seed-campaign-data.js
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') }) } catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing env vars'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(2)
const daysAgo = d => new Date(Date.now() - d * 86400000).toISOString()
const daysFromNow = d => new Date(Date.now() + d * 86400000).toISOString()
const tsAgo = d => new Date(Date.now() - d * 86400000 + rand(0, 43200) * 1000).toISOString()

const CREATORS = [
  { channel_name: 'TechBurner', channel_url: 'https://youtube.com/@TechBurner', platform: 'youtube', subscribers: 8200000, avg_views: 1200000, engagement_rate: 4.8 },
  { channel_name: 'CarryMinati', channel_url: 'https://youtube.com/@CarryMinati', platform: 'youtube', subscribers: 42000000, avg_views: 8500000, engagement_rate: 3.2 },
  { channel_name: 'BB Ki Vines', channel_url: 'https://youtube.com/@BBKiVines', platform: 'youtube', subscribers: 16000000, avg_views: 3200000, engagement_rate: 5.1 },
  { channel_name: 'Ashish Chanchlani', channel_url: 'https://youtube.com/@ashishchanchlani', platform: 'youtube', subscribers: 31000000, avg_views: 5800000, engagement_rate: 3.8 },
  { channel_name: 'Sandeep Maheshwari', channel_url: 'https://youtube.com/@SandeepMaheshwari', platform: 'youtube', subscribers: 28000000, avg_views: 4100000, engagement_rate: 6.2 },
  { channel_name: 'BeerBiceps', channel_url: 'https://youtube.com/@BeerBiceps', platform: 'youtube', subscribers: 11000000, avg_views: 2100000, engagement_rate: 4.5 },
  { channel_name: 'Nisha Madhulika', channel_url: 'https://youtube.com/@NishaMadhulika', platform: 'youtube', subscribers: 14000000, avg_views: 1800000, engagement_rate: 7.1 },
  { channel_name: 'Sanjay Thumma', channel_url: 'https://youtube.com/@vahchef', platform: 'youtube', subscribers: 9500000, avg_views: 1400000, engagement_rate: 5.8 },
  { channel_name: 'Dhruv Rathee', channel_url: 'https://youtube.com/@dhruvrathee', platform: 'youtube', subscribers: 25000000, avg_views: 6200000, engagement_rate: 4.1 },
  { channel_name: 'Technical Guruji', channel_url: 'https://youtube.com/@TechnicalGuruji', platform: 'youtube', subscribers: 23000000, avg_views: 3800000, engagement_rate: 3.6 },
  { channel_name: 'Prajakta Koli', channel_url: 'https://youtube.com/@mostlysane', platform: 'youtube', subscribers: 7800000, avg_views: 1500000, engagement_rate: 5.4 },
  { channel_name: 'Bhuvan Bam', channel_url: 'https://youtube.com/@bhuvanbam2', platform: 'youtube', subscribers: 20000000, avg_views: 4500000, engagement_rate: 4.9 },
  { channel_name: 'Ranveer Allahbadia', channel_url: 'https://youtube.com/@BeerBicepsTech', platform: 'youtube', subscribers: 5200000, avg_views: 980000, engagement_rate: 5.7 },
  { channel_name: 'Harsh Beniwal', channel_url: 'https://youtube.com/@HarshBeniwal', platform: 'youtube', subscribers: 16000000, avg_views: 3100000, engagement_rate: 4.3 },
  { channel_name: 'Lakshya Chaudhary', channel_url: 'https://youtube.com/@LakshyaChaudhary', platform: 'youtube', subscribers: 4800000, avg_views: 820000, engagement_rate: 6.0 },
  { channel_name: 'Mumbaiker Nikhil', channel_url: 'https://youtube.com/@nikhilsharma', platform: 'youtube', subscribers: 3900000, avg_views: 650000, engagement_rate: 5.2 },
  { channel_name: 'Sejal Kumar', channel_url: 'https://youtube.com/@sejalkumar', platform: 'instagram', subscribers: 2100000, avg_views: 480000, engagement_rate: 6.8 },
  { channel_name: 'Masoom Minawala', channel_url: 'https://instagram.com/masoomminawala', platform: 'instagram', subscribers: 1800000, avg_views: 420000, engagement_rate: 7.2 },
  { channel_name: 'Dolly Singh', channel_url: 'https://youtube.com/@DollySingh', platform: 'youtube', subscribers: 3200000, avg_views: 710000, engagement_rate: 5.5 },
  { channel_name: 'Abhishek Upmanyu', channel_url: 'https://youtube.com/@AbhishekUpmanyu', platform: 'youtube', subscribers: 9200000, avg_views: 2400000, engagement_rate: 5.0 },
  { channel_name: 'Kabita Sharma', channel_url: 'https://youtube.com/@kabitasharma', platform: 'youtube', subscribers: 6500000, avg_views: 1100000, engagement_rate: 6.5 },
  { channel_name: 'Gaurav Taneja', channel_url: 'https://youtube.com/@gaboragtaneja', platform: 'youtube', subscribers: 8100000, avg_views: 1600000, engagement_rate: 4.0 },
  { channel_name: 'Khan Sir', channel_url: 'https://youtube.com/@KhanSirOffical', platform: 'youtube', subscribers: 24000000, avg_views: 5100000, engagement_rate: 7.8 },
  { channel_name: 'Ranbir Kapoor Fans', channel_url: 'https://instagram.com/ranbirkapoor', platform: 'instagram', subscribers: 5400000, avg_views: 1200000, engagement_rate: 3.9 },
]

const CAMPAIGNS = [
  {
    name: 'Aquaguard Smart RO Monsoon Campaign',
    brand: 'Aquaguard',
    campaign_type: 'festival_sale',
    objective: 'Drive awareness and sales for Aquaguard Smart RO during monsoon. Target 50M+ impressions.',
    platform_mix: ['youtube_long', 'youtube_shorts', 'instagram_reels'],
    deliverable_types: ['dedicated_video', 'shorts', 'reel'],
    budget: 2800000,
    start_date: daysAgo(45),
    go_live_date: daysAgo(5),
    status: 'active',
    brief_mandatories: 'Mention 9-stage purification. Show water quality test. Festival offer CTA. Hashtag: #PureWaterPureFestival.',
  },
  {
    name: 'boAt Rockerz 551 Launch',
    brand: 'boAt',
    campaign_type: 'product_launch',
    objective: 'Launch boAt Rockerz 551 wireless headphones. Create buzz among 18-28 age group.',
    platform_mix: ['youtube_long', 'youtube_shorts', 'instagram_reels'],
    deliverable_types: ['dedicated_video', 'shorts', 'reel'],
    budget: 3500000,
    start_date: daysAgo(30),
    go_live_date: daysAgo(10),
    status: 'active',
    brief_mandatories: 'Unboxing with build quality focus. Bass test. Discount code BOAT551. Hashtags: #boAtRockerz #BassThatMatters.',
  },
  {
    name: 'Mamaearth Festival of Goodness',
    brand: 'Mamaearth',
    campaign_type: 'festival_sale',
    objective: 'Position Mamaearth as toxin-free personal care brand during festival season.',
    platform_mix: ['youtube_long', 'instagram_reels', 'instagram_stories'],
    deliverable_types: ['dedicated_video', 'reel', 'story'],
    budget: 1800000,
    start_date: daysAgo(60),
    go_live_date: daysAgo(15),
    status: 'active',
    brief_mandatories: 'Show ingredient list. Before/after routine. Natural ingredients messaging. Hashtags: #GoodnessInside.',
  },
  {
    name: 'Zomato New Year Campaign 2026',
    brand: 'Zomato',
    campaign_type: 'seasonal',
    objective: 'Create FOMO around Zomato deliveries during New Year. Drive app installs.',
    platform_mix: ['youtube_shorts', 'instagram_reels', 'instagram_stories'],
    deliverable_types: ['shorts', 'reel', 'story'],
    budget: 4200000,
    start_date: daysAgo(10),
    go_live_date: daysFromNow(20),
    status: 'draft',
    brief_mandatories: 'Show Zomato app UI. Party food moments. First-order discount CTA. Hashtags: #ZomatoParty.',
  },
  {
    name: 'Samsung Galaxy S26 Ultra Creator Edit',
    brand: 'Samsung',
    campaign_type: 'product_launch',
    objective: 'Showcase Galaxy S26 Ultra camera capabilities through creator content.',
    platform_mix: ['youtube_long', 'youtube_shorts', 'instagram_reels'],
    deliverable_types: ['dedicated_video', 'shorts', 'reel'],
    budget: 5500000,
    start_date: daysAgo(90),
    go_live_date: daysAgo(45),
    status: 'completed',
    brief_mandatories: 'Camera comparison shots. Nightography demo. AI photo features. Hashtags: #GalaxyS26Ultra.',
  },
]

const CREATOR_STATUSES = ['shortlisted', 'client_review', 'negotiating', 'onboarded', 'active', 'completed', 'rejected']
const DELIVERABLE_STATUSES = ['pending', 'script_pending', 'script_approved', 'filming', 'in_review', 'approved', 'live']
const ACTOR_NAMES = ['Haji Karim', 'Priya Sharma', 'Rahul Verma', 'Neha Gupta', 'Amit Patel']
const ACTOR_ROLES = ['brand_solutions', 'campaign_manager', 'ir_manager', 'ir_executive']

async function getUserId() {
  const { data } = await supabase.from('users').select('id').limit(1).single()
  return data?.id || null
}

async function clearExisting() {
  console.log('Clearing existing campaign data...')
  await supabase.from('cp_activity_feed').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cp_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cp_script_versions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cp_negotiation_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cp_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cp_deliverables').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cp_creators').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cp_campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  Cleared.')
}

async function seedCampaigns(userId) {
  console.log('\nSeeding campaigns...')
  const campaignIds = []
  for (const c of CAMPAIGNS) {
    const { data, error } = await supabase.from('cp_campaigns').insert({
      name: c.name,
      brand: c.brand,
      campaign_type: c.campaign_type,
      objective: c.objective,
      platform_mix: c.platform_mix,
      deliverable_types: c.deliverable_types,
      budget: c.budget,
      start_date: c.start_date,
      go_live_date: c.go_live_date,
      status: c.status,
      brief_mandatories: c.brief_mandatories,
      created_by: userId,
      sla_client_feedback_hours: 48,
      sla_script_days: 5,
      sla_content_days: 7,
      sla_onboard_to_live_days: 15,
    }).select('id, name').single()
    if (error) { console.error(`  Error: ${error.message}`); continue }
    campaignIds.push(data)
    console.log(`  + ${data.name} (${data.id})`)
  }
  return campaignIds
}

async function seedCreators(campaignIds, userId) {
  console.log('\nSeeding creators...')
  const allCreators = []
  for (const camp of campaignIds) {
    const numCreators = rand(6, 10)
    const shuffled = [...CREATORS].sort(() => 0.5 - Math.random()).slice(0, numCreators)
    for (const cr of shuffled) {
      const status = pick(CREATOR_STATUSES)
      const internalCost = rand(50000, 500000)
      const quotedCost = internalCost + rand(10000, 200000)
      const { data, error } = await supabase.from('cp_creators').insert({
        campaign_id: camp.id,
        channel_name: cr.channel_name,
        channel_url: cr.channel_url,
        platform: cr.platform,
        subscribers: cr.subscribers,
        avg_views: cr.avg_views,
        engagement_rate: cr.engagement_rate,
        internal_cost: internalCost,
        quoted_cost: quotedCost,
        status: status,
        rejection_reason: status === 'rejected' ? pick(['Budget mismatch', 'Audience overlap', 'Content quality concerns', 'Scheduling conflict']) : null,
        onboarded_at: status === 'onboarded' || status === 'active' || status === 'completed' ? tsAgo(rand(10, 40)) : null,
        added_by: userId,
      }).select('id, channel_name, status, campaign_id').single()
      if (error) { console.error(`  Error: ${error.message}`); continue }
      allCreators.push(data)
    }
    console.log(`  + ${numCreators} creators for ${camp.name}`)
  }
  return allCreators
}

async function seedDeliverables(campaignIds, creators) {
  console.log('\nSeeding deliverables...')
  const allDeliverables = []
  for (const camp of campaignIds) {
    const campCreators = creators.filter(c => c.campaign_id === camp.id && c.status !== 'rejected')
    for (const cr of campCreators) {
      const numDeliverables = rand(1, 3)
      for (let i = 0; i < numDeliverables; i++) {
        const status = pick(DELIVERABLE_STATUSES)
        const platform = pick(camp.platform_mix || ['youtube_long'])
        const isLive = status === 'live' || status === 'approved'
        const { data, error } = await supabase.from('cp_deliverables').insert({
          creator_id: cr.id,
          campaign_id: camp.id,
          platform: platform,
          status: status,
          live_link: isLive ? `https://${platform.startsWith('youtube') ? 'youtube.com/watch?v=' : 'instagram.com/p/'}${Math.random().toString(36).substring(2, 13)}` : null,
          live_link_added_at: isLive ? tsAgo(rand(1, 20)) : null,
          tracking_started_at: isLive ? tsAgo(rand(1, 25)) : null,
          views: isLive ? rand(50000, 5000000) : 0,
          likes: isLive ? rand(2000, 200000) : 0,
          comments: isLive ? rand(100, 15000) : 0,
          shares: isLive ? rand(50, 5000) : 0,
          engagement_rate: isLive ? randFloat(1.5, 9.0) : 0,
          script_current_version: ['script_pending', 'script_approved', 'filming', 'in_review', 'approved', 'live'].includes(status) ? rand(1, 3) : 0,
          last_metrics_refresh: isLive ? tsAgo(0) : null,
        }).select('id, status, campaign_id').single()
        if (error) { console.error(`  Error: ${error.message}`); continue }
        allDeliverables.push(data)
      }
    }
  }
  console.log(`  + ${allDeliverables.length} deliverables`)
  return allDeliverables
}

async function seedScripts(deliverables, userId) {
  console.log('\nSeeding scripts...')
  let count = 0
  for (const del of deliverables) {
    if (del.status === 'pending') continue
    const numScripts = rand(1, 3)
    for (let v = 1; v <= numScripts; v++) {
      const status = v === numScripts ? pick(['draft', 'approved']) : 'approved'
      const { error } = await supabase.from('cp_script_versions').insert({
        deliverable_id: del.id,
        campaign_id: del.campaign_id,
        version_number: v,
        content_text: `Script v${v}: Hey guys! Today I'm reviewing this amazing product. Let me show you the unboxing and my honest review. The build quality is fantastic and the features are incredible. Check out the link in description for an exclusive discount!`,
        status: status,
        approved_at: status === 'approved' ? tsAgo(rand(1, 15)) : null,
        approved_by: status === 'approved' ? userId : null,
        feedback_remark: v > 1 ? 'Revised based on brand feedback - added mandatory mentions' : '',
        created_by: userId,
      })
      if (!error) count++
    }
  }
  console.log(`  + ${count} script versions`)
}

async function seedNegotiations(creators) {
  console.log('\nSeeding negotiations...')
  let count = 0
  for (const cr of creators) {
    if (['shortlisted', 'client_review', 'rejected'].includes(cr.status)) continue
    const rounds = rand(1, 3)
    for (let r = 1; r <= rounds; r++) {
      const { error } = await supabase.from('cp_negotiation_log').insert({
        creator_id: cr.id,
        campaign_id: cr.campaign_id,
        round_number: r,
        cost_offered: rand(80000, 400000),
        cost_returned: r < rounds ? rand(80000, 400000) : null,
        remarks: pick(['Too high, please revise', 'Counter offer accepted', 'Final rate locked', 'Need scope adjustment']),
        offered_by_role: pick(ACTOR_ROLES),
      })
      if (!error) count++
    }
  }
  console.log(`  + ${count} negotiation entries`)
}

async function seedActivityFeed(campaignIds, userId) {
  console.log('\nSeeding activity feed...')
  let count = 0
  const actions = [
    { action_type: 'created', entity_type: 'campaign', details: {} },
    { action_type: 'updated', entity_type: 'campaign', details: { field: 'objective' } },
    { action_type: 'status_changed', entity_type: 'campaign', details: { from: 'draft', to: 'active' } },
    { action_type: 'shortlisted', entity_type: 'creator', details: {} },
    { action_type: 'negotiated', entity_type: 'creator', details: { round: 1 } },
    { action_type: 'onboarded', entity_type: 'creator', details: {} },
    { action_type: 'status_changed', entity_type: 'deliverable', details: { from: 'pending', to: 'script_pending' } },
    { action_type: 'script_submitted', entity_type: 'deliverable', details: { version: 1 } },
    { action_type: 'approved', entity_type: 'deliverable', details: {} },
    { action_type: 'live_link_added', entity_type: 'deliverable', details: {} },
    { action_type: 'remarked', entity_type: 'campaign', details: { note: 'Budget approved by finance team' } },
    { action_type: 'cost_returned', entity_type: 'creator', details: { cost: 150000 } },
  ]
  for (const camp of campaignIds) {
    const numActivities = rand(8, 15)
    for (let i = 0; i < numActivities; i++) {
      const act = pick(actions)
      const actorName = pick(ACTOR_NAMES)
      const { error } = await supabase.from('cp_activity_feed').insert({
        campaign_id: camp.id,
        actor_user_id: userId,
        actor_role: pick(ACTOR_ROLES),
        actor_name: actorName,
        action_type: act.action_type,
        entity_type: act.entity_type,
        entity_name: camp.name,
        details: act.details,
        created_at: tsAgo(rand(0, 60)),
      })
      if (!error) count++
    }
  }
  console.log(`  + ${count} activity items`)
}

async function seedNotifications(campaignIds, userId) {
  console.log('\nSeeding notifications...')
  let count = 0
  const notifTemplates = [
    { type: 'your_turn', title: 'Script approval needed', body: 'Creator has submitted a new script version for your review.' },
    { type: 'your_turn', title: 'Creator onboarding pending', body: 'Please complete onboarding for the shortlisted creator.' },
    { type: 'deadline', title: 'Go-live deadline approaching', body: 'Content must go live within 3 days. Please follow up with creator.' },
    { type: 'escalation', title: 'SLA breach warning', body: 'Client feedback SLA has been exceeded. Escalating to campaign manager.' },
    { type: 'digest', title: 'Weekly campaign digest', body: '3 creators onboarded, 2 scripts pending, 1 content live this week.' },
    { type: 'your_turn', title: 'Cost approval required', body: 'Creator has returned a counter-offer. Please review and approve.' },
    { type: 'deadline', title: 'Script review overdue', body: 'Script v2 was submitted 2 days ago and is pending review.' },
    { type: 'digest', title: 'Monthly performance update', body: 'Total impressions: 12.5M. Average engagement: 4.2%. 8 posts live.' },
  ]
  for (const camp of campaignIds) {
    const numNotifs = rand(3, 7)
    for (let i = 0; i < numNotifs; i++) {
      const tpl = pick(notifTemplates)
      const { error } = await supabase.from('cp_notifications').insert({
        user_id: userId,
        campaign_id: camp.id,
        type: tpl.type,
        title: tpl.title,
        body: tpl.body,
        entity_type: 'campaign',
        entity_id: camp.id,
        is_read: Math.random() > 0.5,
        created_at: tsAgo(rand(0, 30)),
      })
      if (!error) count++
    }
  }
  console.log(`  + ${count} notifications`)
}

async function main() {
  console.log('=== Campaign Panel — Comprehensive Seed ===\n')

  const userId = await getUserId()
  if (!userId) {
    console.error('No user found. Run seed-campaign-panel.js first.')
    process.exit(1)
  }
  console.log(`Using user: ${userId}\n`)

  await clearExisting()
  const campaignIds = await seedCampaigns(userId)
  const creators = await seedCreators(campaignIds, userId)
  const deliverables = await seedDeliverables(campaignIds, creators)
  await seedScripts(deliverables, userId)
  await seedNegotiations(creators)
  await seedActivityFeed(campaignIds, userId)
  await seedNotifications(campaignIds, userId)

  console.log('\n=== Done! Refresh http://localhost:3000/campaigns ===')
}

main().catch(console.error)
