/**
 * Instagram Cookie Extractor
 * Opens Instagram in browser, waits for manual login, then saves cookies
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '.sessions');
const COOKIE_FILE = path.join(SESSION_DIR, 'ig-cookies.json');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

(async () => {
  console.log('🌐 Opening Instagram in browser...');
  console.log('📝 Please login manually with your Instagram account');
  console.log('⏳ Waiting for login... (press Ctrl+C to cancel)\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.goto('https://www.instagram.com/accounts/login/?hl=en', { waitUntil: 'networkidle2' });

  // Wait for user to login
  console.log(' Monitoring for successful login...');
  
  let loggedIn = false;
  const checkInterval = setInterval(async () => {
    try {
      const url = page.url();
      const cookies = await page.cookies();
      const hasSessionId = cookies.some(c => c.name === 'sessionid');
      
      // Check if we're no longer on login page AND have sessionid
      if (!url.includes('/accounts/login/') && !url.includes('/challenge/') && hasSessionId) {
        loggedIn = true;
        clearInterval(checkInterval);
        
        console.log('\n✅ Login detected!');
        console.log('🍪 Saving cookies...');
        
        // Wait a bit for all cookies to be set
        await new Promise(r => setTimeout(r, 3000));
        
        const finalCookies = await page.cookies();
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(finalCookies, null, 2));
        
        console.log(`✅ Saved ${finalCookies.length} cookies to ${COOKIE_FILE}`);
        
        // Show sessionid
        const sessionCookie = finalCookies.find(c => c.name === 'sessionid');
        if (sessionCookie) {
          console.log(`🔑 Session ID: ${sessionCookie.value.substring(0, 40)}...`);
        } else {
          console.log('⚠️ Warning: sessionid not found in cookies');
        }
        
        console.log('\n🎉 Cookies saved! You can now run the scraper.');
        console.log('📝 Command: node scraper-robust.js [input.csv] [output.csv]\n');
        
        await browser.close();
        process.exit(0);
      }
      
      if (hasSessionId) {
        console.log(' Session ID detected, waiting for navigation...');
      }
    } catch (e) {
      // Ignore errors during check
    }
  }, 2000);

  // Timeout after 5 minutes
  setTimeout(() => {
    if (!loggedIn) {
      console.log('\n⏰ Timeout reached. Please try again.');
      browser.close();
      process.exit(1);
    }
  }, 5 * 60 * 1000);

})();
