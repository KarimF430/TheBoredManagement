require('dotenv').config({ path: '.env.local' });
const { scrapeKeyword } = require('./src/lib/scrape-pipeline-pg');

async function test() {
  const campaignId = '7be23671-4f0c-432c-ba59-a52fb8ad0224';
  const keywordId = 'b8c658b4-c1c0-42fa-8d5b-ca8f0c43e961';
  const keywordText = 'wet grinder 5 litre';

  console.log(`Starting test scrape for keyword: "${keywordText}"...`);
  try {
    const res = await scrapeKeyword(campaignId, keywordId, keywordText, { archiveBefore: true });
    console.log('Scrape result success:', res);
  } catch (err) {
    console.error('Scrape result failed:', err);
  }
}

test();
