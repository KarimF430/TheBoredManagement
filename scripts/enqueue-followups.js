const { createClient } = require('@supabase/supabase-js')
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: f1 } = await c.from('outreach_templates').select('id,subject,body_text').eq('stage', 'followup_1').eq('active', true).limit(1)
  const { data: f2 } = await c.from('outreach_templates').select('id,subject,body_text').eq('stage', 'followup_2').eq('active', true).limit(1)
  const { data: cr } = await c.from('outreach_creators').select('id').eq('email', 'rajdeep.more@theboredmonkey.com').limit(1)

  await c.from('outreach_send_queue').insert([
    {
      dedupe_key: 'rajdeep_fu1_' + Date.now(),
      creator_id: cr[0].id,
      recipient_email: 'rajdeep.more@theboredmonkey.com',
      tier: 'tier1', stage: 'followup_1',
      template_id: f1[0].id, subject: f1[0].subject, body_text: f1[0].body_text,
      priority: 1, status: 'queued',
    },
    {
      dedupe_key: 'rajdeep_fu2_' + Date.now(),
      creator_id: cr[0].id,
      recipient_email: 'rajdeep.more@theboredmonkey.com',
      tier: 'tier1', stage: 'followup_2',
      template_id: f2[0].id, subject: f2[0].subject, body_text: f2[0].body_text,
      priority: 2, status: 'queued',
    },
  ])
  console.log('Enqueued followup_1 and followup_2')
}

run().catch(console.error)
