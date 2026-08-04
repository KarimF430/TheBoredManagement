require('dotenv').config({ path: '.env.local' });
const { runDailyViewUpdatePg } = require('./src/lib/scrape-pipeline-pg');

async function test() {
  console.log('Starting daily views update test...');
  try {
    const res = await runDailyViewUpdatePg();
    console.log('Daily views result:', res);
  } catch (err) {
    console.error('Daily views failed with error:', err);
  }
}

test();
