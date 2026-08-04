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
  const today = new Date().toISOString().split('T')[0];
  const res = await client.query('UPDATE api_keys SET units_used = 0, reset_date = $1 WHERE is_active = TRUE', [today]);
  console.log('Reset API keys count:', res.rowCount);

  const keys = await client.query('SELECT id, units_used, units_limit, reset_date FROM api_keys');
  console.table(keys.rows);

  await client.end();
}

run().catch(console.error);
