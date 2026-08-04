const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.replace(/\\n/g, '\n');
  }
});

let url = env.DATABASE_URL.replace('db.xtaytjrorlpbivoyntgd.supabase.co', 'aws-0-ap-southeast-1.pooler.supabase.com');
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const apiKeys = await client.query('SELECT id, units_used, units_limit, reset_date, is_active FROM api_keys');
  console.log('\nAPI Keys status:');
  console.table(apiKeys.rows);

  const keywordsPending = await client.query("SELECT id, text, campaign_id, status, last_scraped_at FROM keywords WHERE last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '12 hours' LIMIT 10");
  console.log('\nPending Keywords (unscraped in 12h):', keywordsPending.rows.length);
  console.table(keywordsPending.rows);

  await client.end();
}

run().catch(console.error);
