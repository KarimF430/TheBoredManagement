require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const foreign = [
    'unbox therapy', 'marques brownlee', 'mkbhd', 'mrwhosetheboss', 'linus tech tips', 'ijustine',
    'dave2d', 'uravgconsumer', 'austin evans', 'techspurt', 'the verge', 'cnet', 'engadget'
  ];
  for(const ch of foreign) {
    const { error } = await supabase.from('videos')
      .update({is_irrelevant: true, irrelevant_reason: 'Known foreign channel', irrelevant_score: 1})
      .ilike('channel_name', `%${ch}%`);
    if (error) console.error("Error for", ch, error);
  }
  console.log('Done marking foreign channels as irrelevant in DB.');
}

fix().catch(console.error);
