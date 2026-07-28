const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'placeholder';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Need dotenv to load the real ones
require('dotenv').config({ path: '.env.local' });
const realSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await realSupabase.from('videos').select('*').limit(1);
  console.log(error || data);
}
check();
