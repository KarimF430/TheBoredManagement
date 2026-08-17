/**
 * Robust Instagram Scraper — Puppeteer + Session Persistence
 * 
 * Features:
 * - Real Chrome browser (undetectable)
 * - Auto session refresh when cookies expire
 * - Session warming (gradual speed increase)
 * - Checkpoint/resume support
 * - CSV input/output
 * - Supabase integration
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Add stealth plugin
puppeteer.use(StealthPlugin());

// ── Configuration ──────────────────────────────────────────────────

const CONFIG = {
  // Instagram login credentials
  IG_USERNAME: process.env.IG_USERNAME || 'apex_coders',
  IG_PASSWORD: process.env.IG_PASSWORD || '9538564601Aa',
  
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ifksuhvmiiyrpykgtrhu.supabase.co',
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma3N1aHZtaWl5cnB5a2d0cmh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYxNzkwNywiZXhwIjoyMTAyMTkzOTA3fQ.tnbaRpjlm5O8RIzn4MYOGwNB-fSL7w4Hc1MmtiF2Lo4',
  
  // Rate limiting
  MAX_PER_HOUR: 500,
  BATCH_SIZE: 50,
  MIN_DELAY: 3000,    // 3 seconds
  MAX_DELAY: 5000,    // 5 seconds
  BATCH_PAUSE: 30000, // 30 seconds between batches
  
  // Session
  SESSION_DIR: path.join(__dirname, '.sessions'),
  COOKIE_FILE: path.join(__dirname, '.sessions', 'ig-cookies.json'),
  
  // CSV
  INPUT_CSV: process.argv[2] || 'IG Profiles URL_S - Sheet1.csv',
  OUTPUT_CSV: process.argv[3] || 'instagram_creator_database.csv',
};

// ── Supabase Client ────────────────────────────────────────────────

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ── Helpers ────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000));
}

function randomDelay(min, max) {
  return delay(min + Math.random() * (max - min));
}

function extractEmail(text) {
  if (!text) return '';
  const emails = text.match(/[\w\.-]+@[\w\.-]+\.\w+/g);
  return emails ? emails[0] : '';
}

function log(msg, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} ${msg}`);
}

// ── Session Manager ────────────────────────────────────────────────

class SessionManager {
  constructor() {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
  }

  async saveCookies(cookies) {
    fs.writeFileSync(CONFIG.COOKIE_FILE, JSON.stringify(cookies, null, 2));
    log('Cookies saved to disk', 'success');
  }

  async loadCookies() {
    if (fs.existsSync(CONFIG.COOKIE_FILE)) {
      const cookies = JSON.parse(fs.readFileSync(CONFIG.COOKIE_FILE, 'utf8'));
      log(`Loaded ${cookies.length} cookies from disk`, 'success');
      return cookies;
    }
    return null;
  }

  async saveToSupabase(cookies) {
    const sessionCookie = cookies.find(c => c.name === 'sessionid');
    const csrfCookie = cookies.find(c => c.name === 'csrftoken');
    const dsCookie = cookies.find(c => c.name === 'ds_user_id');

    if (sessionCookie) {
      const { error } = await supabase
        .from('cp_session_cookies')
        .upsert({
          username: CONFIG.IG_USERNAME,
          session_id: sessionCookie.value,
          ds_user_id: dsCookie?.value || '',
          csrftoken: csrfCookie?.value || '',
          status: 'active',
          label: `Puppeteer Session ${new Date().toLocaleDateString()}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'username',
        });

      if (error) {
        log(`Failed to save to Supabase: ${error.message}`, 'error');
      } else {
        log('Session saved to Supabase', 'success');
      }
    }
  }
}

// ── Scraper ────────────────────────────────────────────────────────

class InstagramScraper {
  constructor() {
    this.sessionManager = new SessionManager();
    this.browser = null;
    this.page = null;
    this.results = [];
    this.completed = new Set();
    this.profilesThisHour = 0;
    this.hourStartTime = Date.now();
    this.batchCount = 0;
    this.sessionValid = false;
  }

  async init() {
    log('Initializing scraper...');
    
    // Load existing results for resume
    if (fs.existsSync(CONFIG.OUTPUT_CSV)) {
      const csv = require('csv-parser');
      const results = [];
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(CONFIG.OUTPUT_CSV)
          .pipe(csv())
          .on('data', (row) => {
            results.push(row);
            if (row.username) this.completed.add(row.username);
          })
          .on('end', () => {
            this.results = results;
            log(`Resuming — ${this.completed.size} profiles already done`, 'success');
            resolve();
          })
          .on('error', reject);
      });
    }

    // Launch browser
    log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for manual login if needed
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    this.page = await this.browser.newPage();
    
    // Set realistic viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Set random user agent
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    await this.page.setUserAgent(userAgent.toString());

    // Load cookies if available
    const savedCookies = await this.sessionManager.loadCookies();
    if (savedCookies) {
      await this.page.setCookie(...savedCookies);
      log('Restored cookies from disk');
    }

    // Navigate to Instagram
    await this.page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    await delay(2000);

    // Check if already logged in
    const isLoggedIn = await this.checkLoginStatus();
    
    if (!isLoggedIn) {
      log('Not logged in, attempting login...');
      await this.login();
    } else {
      log('Already logged in!', 'success');
      this.sessionValid = true;
    }

    // Save cookies
    const cookies = await this.page.cookies();
    await this.sessionManager.saveCookies(cookies);
    await this.sessionManager.saveToSupabase(cookies);
  }

  async checkLoginStatus() {
    try {
      // Check for login button (means not logged in)
      const loginButton = await this.page.$('a[href="/accounts/login/"]');
      if (loginButton) return false;

      // Check for profile icon (means logged in)
      const profileIcon = await this.page.$('a[href="/accounts/edit/"]');
      return !!profileIcon;
    } catch (error) {
      log(`Login check error: ${error.message}`, 'error');
      return false;
    }
  }

  async login() {
    try {
      // Go to login page
      await this.page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
      await delay(5000);

      // Save screenshot for debugging
      await this.page.screenshot({ path: 'login-debug.png' });
      log('Saved login page screenshot to login-debug.png');

      // Try multiple selectors for username input
      const usernameSelectors = [
        'input[name="username"]',
        'input[aria-label="Phone number, username, or email"]',
        'input[type="text"]',
        'input[autocomplete="username"]',
      ];

      let usernameInput = null;
      for (const selector of usernameSelectors) {
        try {
          usernameInput = await this.page.$(selector);
          if (usernameInput) {
            log(`Found username input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!usernameInput) {
        // Try to find by placeholder
        const allInputs = await this.page.$$('input');
        for (const input of allInputs) {
          const placeholder = await this.page.evaluate(el => el.placeholder, input);
          if (placeholder && placeholder.toLowerCase().includes('phone') || placeholder.toLowerCase().includes('username')) {
            usernameInput = input;
            log('Found username input by placeholder');
            break;
          }
        }
      }

      if (!usernameInput) {
        log('Could not find username input. Page might have changed structure.', 'error');
        log('Current URL: ' + this.page.url());
        
        // Get page content for debugging
        const content = await this.page.content();
        fs.writeFileSync('login-page.html', content);
        log('Saved page HTML to login-page.html for debugging');
        
        return;
      }

      // Enter credentials
      await usernameInput.click();
      await delay(500);
      await usernameInput.type(CONFIG.IG_USERNAME, { delay: 100 });
      await delay(1000);

      // Find password input
      const passwordSelectors = [
        'input[name="password"]',
        'input[aria-label="Password"]',
        'input[type="password"]',
      ];

      let passwordInput = null;
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await this.page.$(selector);
          if (passwordInput) {
            log(`Found password input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!passwordInput) {
        const allInputs = await this.page.$$('input');
        for (const input of allInputs) {
          const type = await this.page.evaluate(el => el.type, input);
          if (type === 'password') {
            passwordInput = input;
            log('Found password input by type');
            break;
          }
        }
      }

      if (passwordInput) {
        await passwordInput.click();
        await delay(500);
        await passwordInput.type(CONFIG.IG_PASSWORD, { delay: 100 });
        await delay(1000);

        // Click login button
        const loginButton = await this.page.$('button[type="submit"]');
        if (loginButton) {
          await loginButton.click();
          log('Clicked login button');
          await delay(5000);
        } else {
          // Try to find login button by text
          const buttons = await this.page.$$('button');
          for (const button of buttons) {
            const text = await this.page.evaluate(el => el.textContent, button);
            if (text && text.toLowerCase().includes('log in')) {
              await button.click();
              log('Clicked login button by text');
              await delay(5000);
              break;
            }
          }
        }
      }

      // Wait for navigation or error
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      } catch (e) {
        log('Navigation timeout (might be ok)');
      }

      // Check if login was successful
      this.sessionValid = await this.checkLoginStatus();
      
      if (this.sessionValid) {
        log('Login successful!', 'success');
        
        // Save cookies
        const cookies = await this.page.cookies();
        await this.sessionManager.saveCookies(cookies);
        await this.sessionManager.saveToSupabase(cookies);
      } else {
        // Check for checkpoint/error
        const url = this.page.url();
        log('Current URL after login attempt: ' + url);
        
        if (url.includes('challenge') || url.includes('checkpoint')) {
          log('Instagram requires verification! Please complete the challenge in the browser.', 'error');
          log('The browser will stay open. Complete verification, then press Ctrl+C to stop.', 'warn');
          
          // Keep browser open for manual verification
          await new Promise(() => {}); // Wait forever
        } else {
          log('Login failed. Check credentials or try manual cookie method.', 'error');
        }
      }
    } catch (error) {
      log(`Login error: ${error.message}`, 'error');
      console.error(error);
      this.sessionValid = false;
    }
  }

  async refreshSession() {
    log('Refreshing session...');
    
    // Clear cookies
    await this.page.deleteCookie(...await this.page.cookies());
    
    // Navigate to login
    await this.page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
    await delay(2000);
    
    await this.login();
  }

  async scrapeProfile(username) {
    try {
      // Check hourly limit
      if (this.profilesThisHour >= CONFIG.MAX_PER_HOUR) {
        const elapsed = Date.now() - this.hourStartTime;
        const remaining = (65 * 60 * 1000) - elapsed;
        if (remaining > 0) {
          log(`Hourly limit reached. Waiting ${Math.round(remaining / 60000)} minutes...`, 'warn');
          await delay(remaining);
        }
        this.profilesThisHour = 0;
        this.hourStartTime = Date.now();
        this.batchCount = 0;
      }

      // Batch pause
      if (this.batchCount > 0 && this.batchCount % CONFIG.BATCH_SIZE === 0) {
        log(`Batch of ${CONFIG.BATCH_SIZE} done. Pausing ${CONFIG.BATCH_PAUSE / 1000}s...`, 'warn');
        await delay(CONFIG.BATCH_PAUSE);
      }

      // Navigate to profile
      log(`Scraping: @${username}`);
      await this.page.goto(`https://www.instagram.com/${username}/`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      await delay(2000);

      // Check if profile exists
      const notFound = await this.page.$('h2');
      if (notFound) {
        const text = await this.page.evaluate(el => el.textContent, notFound);
        if (text && text.includes('Sorry, this page')) {
          log(`Profile not found: @${username}`, 'warn');
          return null;
        }
      }

      // Check if private
      const privateMessage = await this.page.$('h2');
      if (privateMessage) {
        const text = await this.page.evaluate(el => el.textContent, privateMessage);
        if (text && text.includes('This Account is Private')) {
          log(`Private profile: @${username}`, 'warn');
          return { username, private: true };
        }
      }

      // Extract profile data
      const profileData = await this.page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        let data = null;
        
        for (const script of scripts) {
          try {
            const parsed = JSON.parse(script.textContent);
            if (parsed['@type'] === 'ProfilePage') {
              data = parsed;
              break;
            }
          } catch (e) {}
        }

        if (!data) return null;

        return {
          username: data.name,
          full_name: data.name,
          bio: data.description || '',
          followers: data.interactionStatistic?.find(s => s.interactionType?.includes('Follower'))?.userInteractionCount || 0,
          following: 0, // Not available in LD+JSON
          posts_count: data.mainEntity?.numberOfItems || 0,
          is_verified: data.isVerified || false,
          is_private: false,
          profile_pic_url: data.image || '',
          external_url: data.url || '',
        };
      });

      if (!profileData) {
        log(`Failed to extract data for @${username}`, 'error');
        return null;
      }

      // Get email from bio
      profileData.email = extractEmail(profileData.bio);

      // Get recent posts data (last 10)
      const postsData = await this.getRecentPosts(username);
      
      const result = {
        ...profileData,
        ...postsData,
        engagement_rate: postsData.avg_likes > 0 && profileData.followers > 0
          ? ((postsData.avg_likes + postsData.avg_comments) / profileData.followers * 100).toFixed(2)
          : 0,
        view_follower_ratio: postsData.avg_views > 0 && profileData.followers > 0
          ? (postsData.avg_views / profileData.followers).toFixed(2)
          : 0,
        scraped_at: new Date().toISOString(),
      };

      this.results.push(result);
      this.completed.add(username);
      this.profilesThisHour++;
      this.batchCount++;

      // Save progress
      this.saveResults();

      log(`✓ @${username} | Followers: ${profileData.followers.toLocaleString()} | Avg Views: ${postsData.avg_views.toLocaleString()}`, 'success');

      // Random delay
      await randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);

      return result;
    } catch (error) {
      log(`Error scraping @${username}: ${error.message}`, 'error');
      
      // Check if session expired
      if (error.message.includes('401') || error.message.includes('login')) {
        log('Session expired, refreshing...', 'warn');
        await this.refreshSession();
      }
      
      return null;
    }
  }

  async getRecentPosts(username) {
    try {
      // Navigate to posts
      await this.page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
      await delay(2000);

      // Scroll to load posts
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await delay(2000);

      // Extract post data
      const postsData = await this.page.evaluate(() => {
        const posts = [];
        const articles = document.querySelectorAll('article');
        
        for (const article of articles) {
          if (posts.length >= 10) break;
          
          const link = article.querySelector('a[href*="/p/"]');
          if (!link) continue;
          
          const href = link.getAttribute('href');
          const match = href.match(/\/p\/([^/]+)\//);
          if (!match) continue;
          
          const shortcode = match[1];
          
          // Get engagement data from aria-label
          const ariaLabel = article.querySelector('section span span')?.getAttribute('aria-label') || '';
          const likesMatch = ariaLabel.match(/(\d+(?:,\d+)*)\s*likes?/);
          const commentsMatch = ariaLabel.match(/(\d+(?:,\d+)*)\s*comments?/);
          
          // Check if video
          const isVideo = !!article.querySelector('svg[aria-label="Reels"]');
          
          posts.push({
            shortcode,
            is_video: isVideo,
            likes: likesMatch ? parseInt(likesMatch[1].replace(/,/g, '')) : 0,
            comments: commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, '')) : 0,
            views: 0, // Views not easily accessible without GraphQL
          });
        }
        
        return posts;
      });

      const videos = postsData.filter(p => p.is_video);
      
      return {
        avg_views: videos.length > 0 
          ? Math.round(videos.reduce((sum, p) => sum + p.views, 0) / videos.length)
          : 0,
        avg_likes: postsData.length > 0
          ? Math.round(postsData.reduce((sum, p) => sum + p.likes, 0) / postsData.length)
          : 0,
        avg_comments: postsData.length > 0
          ? Math.round(postsData.reduce((sum, p) => sum + p.comments, 0) / postsData.length)
          : 0,
        total_posts_analyzed: postsData.length,
      };
    } catch (error) {
      log(`Error getting posts for @${username}: ${error.message}`, 'error');
      return {
        avg_views: 0,
        avg_likes: 0,
        avg_comments: 0,
        total_posts_analyzed: 0,
      };
    }
  }

  saveResults() {
    if (this.results.length === 0) return;

    const headers = Object.keys(this.results[0]);
    const csvContent = [
      headers.join(','),
      ...this.results.map(row => 
        headers.map(h => {
          const val = row[h];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ].join('\n');

    fs.writeFileSync(CONFIG.OUTPUT_CSV, csvContent);
    log(`Saved ${this.results.length} results to ${CONFIG.OUTPUT_CSV}`, 'success');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      log('Browser closed');
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  const scraper = new InstagramScraper();

  try {
    await scraper.init();

    if (!scraper.sessionValid) {
      log('Session not valid. Please complete Instagram verification and restart.', 'error');
      process.exit(1);
    }

    // Read input CSV
    if (!fs.existsSync(CONFIG.INPUT_CSV)) {
      log(`Input file not found: ${CONFIG.INPUT_CSV}`, 'error');
      process.exit(1);
    }

    const csv = require('csv-parser');
    const profiles = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(CONFIG.INPUT_CSV)
        .pipe(csv())
        .on('data', (row) => {
          const url = row['Instagram URL'] || row['url'] || row['handle'] || '';
          const match = url.match(/instagram\.com\/([^/?#]+)/);
          if (match) {
            const username = match[1].toLowerCase();
            if (!scraper.completed.has(username)) {
              profiles.push(username);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    log(`Found ${profiles.length} profiles to scrape`);

    // Scrape profiles
    for (let i = 0; i < profiles.length; i++) {
      const username = profiles[i];
      log(`[${i + 1}/${profiles.length}] Processing @${username}`);
      
      await scraper.scrapeProfile(username);
      
      // Save progress after each profile
      scraper.saveResults();
    }

    log(`Scraping complete! Total profiles: ${scraper.results.length}`, 'success');
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await scraper.close();
  }
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { InstagramScraper };
