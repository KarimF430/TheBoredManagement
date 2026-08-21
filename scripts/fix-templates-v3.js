const { createClient } = require('@supabase/supabase-js')
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const templates = [
    {
      stage: 'first_touch',
      name: 'Personal Intro',
      subject: 'quick question',
      body: 'Hey {{first_name}},\n\nCame across your {{niche}} content on {{platform}} today and wanted to reach out.\n\nWe work with creators on brand partnerships and thought of you.\n\nWould you be open to a quick chat about it?\n\n- Haji',
    },
    {
      stage: 'followup_1',
      name: 'Casual Follow-up',
      subject: 'Re: quick question',
      body: 'Hey {{first_name}},\n\nJust checking in - did you see my last message?\n\nTotally fine if not interested. Just didn\'t want it to get lost.\n\n- Haji',
    },
    {
      stage: 'followup_2',
      name: 'Final Note',
      subject: 'Re: quick question',
      body: 'Hey {{first_name}},\n\nLast message from me on this.\n\nIf you ever want to chat about brand work, just reply here. I\'m around.\n\nAll the best,\nHaji',
    },
  ]

  for (const t of templates) {
    const { data: existing } = await c.from('outreach_templates').select('id').eq('stage', t.stage).eq('active', true).limit(1)
    if (existing && existing.length) {
      await c.from('outreach_templates').update({ subject: t.subject, body_text: t.body, name: t.name }).eq('id', existing[0].id)
      console.log('Updated:', t.stage, '-', t.name)
    }
  }
}

run().catch(console.error)
