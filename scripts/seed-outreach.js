/**
 * Seed outreach templates and creators.
 * Run: node scripts/seed-outreach.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEMPLATES = [
  {
    name: 'Cold Outreach - First Touch',
    tier: 'tier1',
    stage: 'first_touch',
    subject: 'Collab idea for {{first_name}} x TheBoredLab',
    body_text: `Hey {{first_name}},

I came across your {{niche}} content on {{platform}} and really enjoyed it. We're building something cool at TheBoredLab — a platform that connects brands with creators like you for authentic partnerships.

I think there's a great fit between your style and some of the brands we work with. Would you be open to a quick chat about a potential collaboration?

If you're interested, you can check out more details here: {{onboarding_link}}

Looking forward to hearing from you!

Best,
Haji
TheBoredLab`,
    body_html: null,
    active: true,
  },
  {
    name: 'Cold Outreach - Follow-up 1',
    tier: 'tier1',
    stage: 'followup_1',
    subject: 'Quick follow-up — collab with {{first_name}}?',
    body_text: `Hi {{first_name}},

Just wanted to circle back on my previous message. I know you're busy, so I'll keep this short — we'd love to explore a collaboration with you at TheBoredLab.

If you haven't had a chance yet, here's the link to get started: {{onboarding_link}}

No pressure at all — just wanted to make sure this didn't get buried in your inbox.

Cheers,
Haji
TheBoredLab`,
    body_html: null,
    active: true,
  },
  {
    name: 'Cold Outreach - Follow-up 2',
    tier: 'tier1',
    stage: 'followup_2',
    subject: 'Last note from me, {{first_name}}',
    body_text: `Hey {{first_name}},

I understand things get busy — this is my last follow-up on this.

If a collaboration with TheBoredLab sounds interesting, you can always jump in here: {{onboarding_link}}

If not, no worries at all. Wishing you all the best with your content!

Best,
Haji
TheBoredLab`,
    body_html: null,
    active: true,
  },
]

const CREATORS = [
  {
    email: 'haji.karim@theboredmonkey.com',
    name: 'Haji Karim',
    niche: 'Tech & Business',
    size_tier: 'micro',
    source: 'manual',
    raw_signals: {
      platform: 'YouTube',
      recent_content: 'Business strategy and tech reviews',
      content_style: 'Educational, conversational',
      audience_demographics: 'Entrepreneurs, tech enthusiasts',
    },
  },
]

async function main() {
  console.log('Seeding outreach templates...')

  for (const t of TEMPLATES) {
    const { data: existing } = await client
      .from('outreach_templates')
      .select('id')
      .eq('name', t.name)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`  Template "${t.name}" already exists — skipping`)
      continue
    }

    const { data, error } = await client
      .from('outreach_templates')
      .insert(t)
      .select()
      .single()

    if (error) {
      console.error(`  Failed to create "${t.name}":`, error.message)
    } else {
      console.log(`  Created template: ${data.name} (${data.id})`)
    }
  }

  console.log('\nSeeding outreach creators...')

  for (const c of CREATORS) {
    const { data: existing } = await client
      .from('outreach_creators')
      .select('id')
      .eq('email', c.email)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`  Creator "${c.email}" already exists — skipping`)
      continue
    }

    const { data, error } = await client
      .from('outreach_creators')
      .insert(c)
      .select()
      .single()

    if (error) {
      console.error(`  Failed to create "${c.email}":`, error.message)
    } else {
      console.log(`  Created creator: ${c.name} <${c.email}> (${data.id})`)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
