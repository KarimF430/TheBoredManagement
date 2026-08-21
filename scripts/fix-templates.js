const { createClient } = require('@supabase/supabase-js')
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const templates = [
    {
      stage: 'first_touch',
      name: 'Personal Intro',
      subject: 'quick question',
      body: 'Hey {{first_name}},\n\nI saw your {{niche}} stuff on {{platform}} - really solid work.\n\nCurious, have you worked with any brands before on sponsored content? We are connecting creators with some cool opportunities and I thought you might be a good fit.\n\nNo website or anything - just wanted to reach out personally.\n\nLet me know if you are open to chatting sometime.\n\n- Haji',
    },
    {
      stage: 'followup_1',
      name: 'Casual Follow-up',
      subject: 'Re: quick question',
      body: 'Hey {{first_name}},\n\nJust bumping this up - I know things get buried.\n\nIf you are not interested no worries at all. Just did not want you to miss it.\n\n- Haji',
    },
    {
      stage: 'followup_2',
      name: 'Final Note',
      subject: 'Re: quick question',
      body: 'Hey {{first_name}},\n\nLast one from me - promise.\n\nIf you ever want to chat about brand work, just reply to this email. I am around.\n\nAll the best with your content.\n\n- Haji',
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
