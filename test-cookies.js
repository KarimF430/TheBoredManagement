const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Load cookies
  const cookies = JSON.parse(fs.readFileSync('.sessions/ig-cookies.json', 'utf8'));
  await page.setCookie(...cookies);
  
  // Go to Instagram
  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  // Check if logged in
  const url = page.url();
  console.log('Current URL:', url);
  
  // Check for login button
  const loginBtn = await page.$('a[href="/accounts/login/"]');
  const profileIcon = await page.$('a[href="/accounts/edit/"]');
  
  console.log('Has login button:', !!loginBtn);
  console.log('Has profile icon:', !!profileIcon);
  console.log('Is logged in:', !loginBtn && !!profileIcon);
  
  // Save screenshot
  await page.screenshot({ path: 'cookie-test.png' });
  console.log('Screenshot saved to cookie-test.png');
  
  await browser.close();
})();
