const { createClient } = require('@supabase/supabase-js')
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  await c.from('outreach_mailboxes').update({ sent_today: 0 }).neq('email', '')
  const { data: ramp } = await c.from('outreach_ramp_state').select('id').limit(1)
  if (ramp?.length) await c.from('outreach_ramp_state').update({ sent_today_global: 0 }).eq('id', ramp[0].id)
  
  const { data: ft } = await c.from('outreach_templates').select('id,subject,body_text').eq('stage', 'first_touch').eq('active', true).limit(1)
  const { data: cr } = await c.from('outreach_creators').select('id').eq('email', 'rajdeep.more@theboredmonkey.com').limit(1)
  
  await c.from('outreach_send_queue').insert({
    dedupe_key: 'rajdeep_final_' + Date.now(),
    creator_id: cr[0].id,
    recipient_email: 'rajdeep.more@theboredmonkey.com',
    tier: 'tier1', stage: 'first_touch',
    template_id: ft[0].id, subject: ft[0].subject, body_text: ft[0].body_text,
    priority: 0, status: 'queued',
  })
  console.log('Enqueued fresh first_touch')
  console.log('Subject:', ft[0].subject)
  console.log('Body:', ft[0].body_text.substring(0, 150))
}

run().catch(console.error)
