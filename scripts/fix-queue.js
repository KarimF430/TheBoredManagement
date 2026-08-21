const { createClient } = require('@supabase/supabase-js')
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // Reset ALL non-queued, non-sent, non-failed items to queued
  const { data: stuck } = await c.from('outreach_send_queue')
    .update({ status: 'queued', claimed_at: null, claimed_by: null })
    .in('status', ['claimed', 'sending'])
    .select()
  console.log('Reset stuck items:', stuck?.length)

  // Reset caps
  await c.from('outreach_mailboxes').update({ sent_today: 0 }).neq('email', '')
  
  // Check queue
  const { data: q } = await c.from('outreach_send_queue')
    .select('id,status,recipient_email,subject,claimed_at')
    .eq('status', 'queued')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log('Queued items:')
  ;(q||[]).forEach(r => console.log('  ', r.status, '|', r.recipient_email, '|', r.subject?.substring(0,30), '| claimed:', r.claimed_at))
}

run().catch(console.error)
