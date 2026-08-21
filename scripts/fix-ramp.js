const { createClient } = require('@supabase/supabase-js')
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // Fix ramp - use correct column name
  const { data: ramp } = await c.from('outreach_ramp_state').select('*').limit(1)
  if (ramp && ramp.length) {
    await c.from('outreach_ramp_state').update({ 
      current_daily_budget: 4,
      sent_today_global: 0,
      current_step: 0
    }).eq('id', ramp[0].id)
    console.log('Fixed ramp: step 0, budget 4, sent 0')
  }
  
  // Reset stuck claimed items to queued
  const { data: stuck } = await c.from('outreach_send_queue').update({ status: 'queued', claimed_at: null, claimed_by: null }).eq('status','claimed').select()
  console.log('Reset stuck items:', stuck?.length)

  // Reset mailboxes
  await c.from('outreach_mailboxes').update({ sent_today: 0 }).neq('email', '')
  console.log('Reset sent_today')

  // Verify
  const { data: r2 } = await c.from('outreach_ramp_state').select('current_step,current_daily_budget,sent_today_global')
  console.log('Ramp now:', JSON.stringify(r2))
  
  const { data: m } = await c.from('outreach_mailboxes').select('email,sent_today,daily_cap')
  console.log('Mailboxes:')
  ;(m||[]).forEach(r => console.log('  ', r.email, '| sent:', r.sent_today, '/ cap:', r.daily_cap))
}

run().catch(console.error)
