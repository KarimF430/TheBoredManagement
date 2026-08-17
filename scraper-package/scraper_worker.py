"""
Instagram Creator Scraper — Robust instaloader-based worker
Multi-cookie rotation, exponential backoff, session warming, jitter.

Called from Node.js via subprocess. Outputs JSON to stdout.
"""

import sys
import json
import os
import time
import random
import re
import statistics
import argparse
from datetime import datetime

import instaloader

# ── Parse args ──────────────────────────────────────────────────────

parser = argparse.ArgumentParser()
parser.add_argument("--mode", choices=["crawl", "csv"], default="crawl")
parser.add_argument("--seed", default="")
parser.add_argument("--csv-file", default="")
parser.add_argument("--depth", type=int, default=2)
parser.add_argument("--max-profiles", type=int, default=500)
parser.add_argument("--output-csv", default="")
parser.add_argument("--username", default="auto_beast97")
parser.add_argument("--password", default="")
parser.add_argument("--checkpoint", default=None)
parser.add_argument("--min-delay", type=float, default=2)
parser.add_argument("--max-delay", type=float, default=4)
parser.add_argument("--batch-size", type=int, default=50)
parser.add_argument("--batch-pause-min", type=int, default=30)
parser.add_argument("--batch-pause-max", type=int, default=60)
parser.add_argument("--max-per-hour", type=int, default=500)
# Multi-cookie: JSON array of {session_id, ds_user_id, csrftoken}
parser.add_argument("--cookies", default="[]")
args = parser.parse_args()

# ── Parse cookies ───────────────────────────────────────────────────

try:
    COOKIE_POOL = json.loads(args.cookies)
except:
    COOKIE_POOL = []

if not COOKIE_POOL:
    COOKIE_POOL = [{"session_id": "", "ds_user_id": "", "csrftoken": ""}]

current_cookie_idx = 0

# ── Helpers ─────────────────────────────────────────────────────────

def emit_progress(msg):
    print(msg, file=sys.stderr)
    sys.stderr.flush()

def emit_checkpoint(data):
    print(f"CHECKPOINT:{json.dumps(data)}", file=sys.stderr)
    sys.stderr.flush()

def emit_cookie_event(event_type, cookie_id, detail=""):
    print(f"COOKIE_EVENT:{json.dumps({'type': event_type, 'cookie_id': cookie_id, 'detail': detail})}", file=sys.stderr)
    sys.stderr.flush()

def extract_email(text):
    if not text:
        return ""
    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    return emails[0] if emails else ""

SKIP_HANDLES = {"media", "instagram", "explore", "reels", "stories", "direct", "accounts", "help"}

# ── Dynamic Rate Limiter ────────────────────────────────────────────

class RateLimiter:
    def __init__(self, max_per_hour=500, warmup_minutes=10):
        self.max_per_hour = max_per_hour
        self.warmup_minutes = warmup_minutes
        self.profiles_this_hour = 0
        self.hour_start = time.time()
        self.session_start = time.time()
        self.consecutive_errors = 0
        self.total_errors = 0
        self.total_profiles = 0
        self.current_delay_min = args.min_delay
        self.current_delay_max = args.max_delay
    
    def get_delay(self):
        """Get delay with jitter and backoff"""
        base_delay = random.uniform(self.current_delay_min, self.current_delay_max)
        
        # Add jitter: ±30% randomization
        jitter = base_delay * random.uniform(-0.3, 0.3)
        delay = max(0.5, base_delay + jitter)
        
        # If we've had errors, slow down more
        if self.consecutive_errors > 0:
            backoff = min(self.consecutive_errors * 2, 30)  # Up to 30s extra
            delay += backoff
        
        return delay
    
    def record_success(self):
        self.consecutive_errors = 0
        self.profiles_this_hour += 1
        self.total_profiles += 1
        
        # Session warming: gradually increase speed
        session_age_minutes = (time.time() - self.session_start) / 60
        if session_age_minutes < self.warmup_minutes:
            # During warmup, use longer delays
            warmup_factor = 1 + (1 - session_age_minutes / self.warmup_minutes) * 0.5
            self.current_delay_min = args.min_delay * warmup_factor
            self.current_delay_max = args.max_delay * warmup_factor
        else:
            self.current_delay_min = args.min_delay
            self.current_delay_max = args.max_delay
    
    def record_error(self):
        self.consecutive_errors += 1
        self.total_errors += 1
        self.profiles_this_hour += 1
        self.total_profiles += 1
    
    def should_pause_hourly(self):
        return self.profiles_this_hour >= self.max_per_hour
    
    def reset_hour(self):
        elapsed = time.time() - self.hour_start
        remaining = 65 * 60 - elapsed  # 65 min
        if remaining > 0:
            emit_progress(f"  {self.max_per_hour}/hour limit reached. Waiting {int(remaining/60)}m {int(remaining%60)}s...")
            time.sleep(remaining)
        self.profiles_this_hour = 0
        self.hour_start = time.time()
    
    def should_pause_batch(self, batch_count):
        return batch_count > 0 and batch_count % args.batch_size == 0
    
    def get_batch_pause(self):
        return random.randint(args.batch_pause_min, args.batch_pause_max)

rate_limiter = RateLimiter(args.max_per_hour)

# ── Instagram Loader Setup ──────────────────────────────────────────

def setup_instaloader(cookie_data=None):
    """Setup instaloader with given cookie or login credentials"""
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False
    )
    
    # Set headers first
    L.context._session.headers.update({
        "x-ig-app-id":      "936619743392459",
        "x-csrftoken":      "",
        "x-requested-with": "XMLHttpRequest",
        "referer":          "https://www.instagram.com/",
        "user-agent":       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    })
    
    L.context.username = args.username
    
    # Login mode: use username + password
    if args.password:
        try:
            L.login(args.username, args.password)
            emit_progress(f"Login successful for @{args.username}")
            return L
        except instaloader.exceptions.BadCredentialsException:
            emit_progress("Login failed: bad username or password")
            return None
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            emit_progress("Login failed: two-factor auth required. Use cookie method instead.")
            return None
        except Exception as e:
            emit_progress(f"Login failed: {e}")
            return None
    
    # Cookie mode: inject cookies
    if cookie_data:
        session_id = cookie_data.get("session_id", "")
        csrftoken = cookie_data.get("csrftoken", "")
        ds_user_id = cookie_data.get("ds_user_id", "")
        
        L.context._session.cookies.set("sessionid",  session_id, domain=".instagram.com")
        L.context._session.cookies.set("csrftoken",  csrftoken,  domain=".instagram.com")
        L.context._session.cookies.set("ds_user_id", ds_user_id, domain=".instagram.com")
        L.context._session.cookies.set("ig_did",     "",         domain=".instagram.com")
        L.context._session.cookies.set("rur",        "",         domain=".instagram.com")
        
        L.context._session.headers["x-csrftoken"] = csrftoken
    
    return L

def test_cookie(L, cookie_data):
    """Test if a cookie is still valid"""
    try:
        test = instaloader.Profile.from_username(L.context, "instagram")
        return True, test.followers
    except instaloader.exceptions.LoginRequiredException:
        return False, "Session expired"
    except instaloader.exceptions.QueryReturnedBadRequestException:
        return False, "Bad request - cookie may be expired"
    except Exception as e:
        return False, str(e)

# ── Initialize Instagram session ────────────────────────────────────

active_L = None
active_cookie = None
active_cookie_idx = 0

# Login mode: use username + password
if args.password:
    emit_progress(f"Logging in as @{args.username}...")
    active_L = setup_instaloader()
    
    if active_L:
        valid, detail = test_cookie(active_L, {})
        if valid:
            emit_progress(f"Login successful! Session working (instagram has {detail:,} followers)")
            active_cookie = {"id": "login", "session_id": "login", "ds_user_id": "login"}
        else:
            emit_progress(f"Login failed: {detail}")
            active_L = None
else:
    # Cookie mode: try each cookie in pool
    emit_progress(f"Testing {len(COOKIE_POOL)} cookies...")
    
    for i, cookie in enumerate(COOKIE_POOL):
        if not cookie.get("session_id"):
            continue
        
        L = setup_instaloader(cookie)
        valid, detail = test_cookie(L, cookie)
        
        if valid:
            active_L = L
            active_cookie = cookie
            active_cookie_idx = i
            emit_progress(f"  Cookie #{i+1} working! (instagram has {detail:,} followers)")
            emit_cookie_event("activated", cookie.get("id", f"idx-{i}"))
            break
        else:
            emit_progress(f"  Cookie #{i+1} failed: {detail}")
            emit_cookie_event("failed", cookie.get("id", f"idx-{i}"), str(detail))

if not active_L:
    emit_progress("No working session! Add cookies or check login credentials.")
    print(json.dumps({
        "profiles": [], "errors": [], "total_found": 0, "total_errors": 0,
        "session_error": "No working session"
    }))
    sys.stdout.flush()
    sys.exit(1)

# ── Load checkpoint ─────────────────────────────────────────────────

visited = set()
queue = []
profiles = []
errors = []

if args.checkpoint:
    try:
        cp = json.loads(args.checkpoint)
        visited = set(cp.get("visited", []))
        queue = [(h, d) for h, d in cp.get("queue", [])]
        emit_progress(f"Resuming — {len(visited)} visited, {len(queue)} in queue")
    except:
        pass

# ── CSV mode ────────────────────────────────────────────────────────

if args.mode == "csv" and args.csv_file:
    import csv as csv_mod
    with open(args.csv_file, "r", encoding="utf-8") as f:
        reader = csv_mod.DictReader(f)
        for row in reader:
            url = row.get("Instagram URL", "") or row.get("url", "") or row.get("handle", "")
            match = re.search(r"instagram\.com/([^/?#]+)/?", url.strip())
            if match:
                h = match.group(1).strip().lower()
                if h and h not in visited and h not in SKIP_HANDLES:
                    queue.append((h, 0))
            elif url.strip() and not url.startswith("http"):
                h = url.strip().lower().lstrip("@")
                if h and h not in visited and h not in SKIP_HANDLES:
                    queue.append((h, 0))
    emit_progress(f"Loaded {len(queue)} handles from CSV")

if args.output_csv and os.path.exists(args.output_csv):
    try:
        import csv as csv_mod
        with open(args.output_csv, "r", encoding="utf-8") as f:
            reader = csv_mod.DictReader(f)
            for row in reader:
                u = row.get("username", "")
                if u:
                    visited.add(u.lower())
        emit_progress(f"Resuming — {len(visited)} profiles already done")
    except:
        pass

# ── Scrape profile with retry on auth failure ───────────────────────

def scrape_profile_with_retry(handle, max_retries=2):
    """Scrape a profile, rotating cookies on auth failure"""
    global active_L, active_cookie, active_cookie_idx
    
    for attempt in range(max_retries + 1):
        try:
            profile = instaloader.Profile.from_username(active_L.context, handle)
            return profile, None, None
        except instaloader.exceptions.LoginRequiredException:
            emit_progress(f"    Cookie expired! Trying next cookie...")
            emit_cookie_event("expired", active_cookie.get("id", ""))
            
            # Try next cookie
            next_idx = (active_cookie_idx + 1) % len(COOKIE_POOL)
            for i in range(len(COOKIE_POOL)):
                check_idx = (next_idx + i) % len(COOKIE_POOL)
                cookie = COOKIE_POOL[check_idx]
                if not cookie.get("session_id"):
                    continue
                
                L = setup_instaloader(cookie)
                valid, detail = test_cookie(L, cookie)
                
                if valid:
                    active_L = L
                    active_cookie = cookie
                    active_cookie_idx = check_idx
                    emit_progress(f"    Switched to cookie #{check_idx+1}")
                    emit_cookie_event("activated", cookie.get("id", f"idx-{check_idx}"))
                    
                    # Retry with new cookie
                    try:
                        profile = instaloader.Profile.from_username(active_L.context, handle)
                        return profile, None, None
                    except:
                        continue
                else:
                    emit_cookie_event("failed", cookie.get("id", f"idx-{check_idx}"), str(detail))
            
            # All cookies exhausted
            return None, "All cookies expired", "auth_error"
            
        except instaloader.exceptions.ProfileNotExistsException:
            return None, "Profile not found", "not_found"
        except instaloader.exceptions.PrivateProfileNotFollowedException:
            return None, "Private profile", "private"
        except instaloader.exceptions.ConnectionException as e:
            if "429" in str(e) or "rate" in str(e).lower():
                wait_time = min(600, 60 * (attempt + 1))
                emit_progress(f"    Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            return None, str(e), "error"
        except Exception as e:
            if attempt < max_retries:
                time.sleep(random.uniform(5, 10))
                continue
            return None, str(e), "error"
    
    return None, "Max retries exceeded", "error"

# ── Main crawl loop ─────────────────────────────────────────────────

batch_count = 0
results_csv = []

while queue and len(profiles) < args.max_profiles:
    handle, depth = queue.pop(0)
    
    if handle in visited:
        continue
    if depth > args.depth:
        continue
    
    visited.add(handle)
    
    # Hourly limit
    if rate_limiter.should_pause_hourly():
        rate_limiter.reset_hour()
        batch_count = 0
    
    # Batch pause
    if rate_limiter.should_pause_batch(batch_count):
        pause = rate_limiter.get_batch_pause()
        emit_progress(f"  Batch of {args.batch_size} done. Pausing {pause}s...")
        time.sleep(pause)
    
    emit_progress(f"  Processing: {handle}")
    
    # Scrape with retry
    profile, error_msg, error_type = scrape_profile_with_retry(handle)
    
    if error_msg:
        if error_type == "auth_error":
            emit_progress("  All cookies exhausted. Stopping.")
            errors.append({"handle": handle, "error": error_msg, "error_type": error_type})
            break
        
        if error_type in ("not_found", "private"):
            emit_progress(f"    {error_msg}: {handle}")
            errors.append({"handle": handle, "error": error_msg, "error_type": error_type})
            rate_limiter.record_success()  # Count as processed
            batch_count += 1
            time.sleep(rate_limiter.get_delay())
            continue
        
        emit_progress(f"    Error: {error_msg}")
        errors.append({"handle": handle, "error": error_msg, "error_type": error_type})
        rate_limiter.record_error()
        time.sleep(rate_limiter.get_delay())
        continue
    
    # ── Extract profile data ──
    followers    = profile.followers
    following    = profile.followees
    total_posts  = profile.mediacount
    full_name    = profile.full_name
    bio          = profile.biography
    external_url = profile.external_url
    is_verified  = profile.is_verified
    is_private   = profile.is_private
    userid       = profile.userid
    profile_pic  = profile.profile_pic_url
    business_category = profile.business_category_name or ""
    email = extract_email(bio)
    
    if is_private:
        emit_progress(f"    Private — skipping: {handle}")
        rate_limiter.record_success()
        batch_count += 1
        time.sleep(rate_limiter.get_delay())
        continue
    
    # ── Fetch last 10 videos ──
    reel_views, likes_list, comments_list, upload_dates = [], [], [], []
    reel_count = 0
    
    try:
        for post in profile.get_posts():
            if post.is_video:
                if post.video_view_count:
                    reel_views.append(post.video_view_count)
                likes_list.append(post.likes)
                comments_list.append(post.comments)
                upload_dates.append(post.date)
                reel_count += 1
            if reel_count >= 10:
                break
    except:
        pass
    
    avg_views    = int(sum(reel_views)/len(reel_views))       if reel_views    else 0
    median_views = int(statistics.median(reel_views))         if reel_views    else 0
    max_views    = max(reel_views)                            if reel_views    else 0
    min_views    = min(reel_views)                            if reel_views    else 0
    avg_likes    = int(sum(likes_list)/len(likes_list))       if likes_list    else 0
    avg_comments = int(sum(comments_list)/len(comments_list)) if comments_list else 0
    engagement_rate = round((avg_likes + avg_comments) / followers * 100, 2) if followers > 0 else 0
    view_ratio = round(avg_views / followers, 2) if followers > 0 else 0
    
    last_upload_date = upload_dates[0] if upload_dates else ""
    days_since_last_upload = (datetime.now() - last_upload_date.replace(tzinfo=None)).days if upload_dates else ""
    
    result = {
        "handle":                    handle,
        "full_name":                 full_name,
        "bio":                       bio,
        "profile_pic_url":           profile_pic,
        "is_verified":               is_verified,
        "is_private":                is_private,
        "is_business":               bool(business_category),
        "followers":                 followers,
        "following":                 following,
        "posts_count":               total_posts,
        "category":                  business_category,
        "email":                     email,
        "website":                   external_url,
        "avg_views":                 avg_views,
        "median_views":              median_views,
        "max_views":                 max_views,
        "min_views":                 min_views,
        "avg_likes":                 avg_likes,
        "avg_comments":              avg_comments,
        "engagement_rate":           engagement_rate,
        "views_to_followers_ratio":  view_ratio,
        "last_upload_date":          str(last_upload_date),
        "days_since_last_upload":    days_since_last_upload,
        "userid":                    userid,
    }
    profiles.append(result)
    
    if args.output_csv:
        results_csv.append({
            "username":                handle,
            "full_name":               full_name,
            "followers":               followers,
            "following":               following,
            "total_posts":             total_posts,
            "business_category":       business_category,
            "bio":                     bio,
            "email":                   email,
            "external_url":            external_url,
            "verified":                is_verified,
            "private":                 is_private,
            "avg_10_reel_views":       avg_views,
            "median_views":            median_views,
            "max_views":               max_views,
            "min_views":               min_views,
            "avg_likes":               avg_likes,
            "avg_comments":            avg_comments,
            "engagement_rate_percent": engagement_rate,
            "view_follower_ratio":     view_ratio,
            "last_upload_date":        last_upload_date,
            "days_since_last_upload":  days_since_last_upload,
            "userid":                  userid,
            "profile_pic_url":         profile_pic,
        })
        import csv as csv_mod
        with open(args.output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv_mod.DictWriter(f, fieldnames=results_csv[0].keys())
            writer.writeheader()
            writer.writerows(results_csv)
    
    emit_progress(f"    {handle} | Followers: {followers:,} | Avg Views: {avg_views:,} | Hour: {rate_limiter.profiles_this_hour}/{args.max_per_hour} | Errors: {rate_limiter.consecutive_errors}")
    
    # Add suggested profiles to queue
    if depth < args.depth:
        try:
            for related in active_L.get_related_profiles(profile):
                if related.username and related.username.lower() not in SKIP_HANDLES and related.username.lower() not in visited:
                    queue.append((related.username.lower(), depth + 1))
        except:
            pass
    
    rate_limiter.record_success()
    batch_count += 1
    
    # Random delay with jitter
    delay = rate_limiter.get_delay()
    time.sleep(delay)
    
    # Checkpoint every 10 profiles
    if len(profiles) % 10 == 0:
        emit_checkpoint({
            "visited": list(visited),
            "queue": queue,
            "profiles_count": len(profiles),
            "errors_count": len(errors),
            "timestamp": datetime.now().isoformat(),
        })

# ── Output final results ────────────────────────────────────────────

output = {
    "profiles": profiles,
    "errors": errors,
    "total_found": len(profiles),
    "total_errors": len(errors),
    "stats": {
        "total_profiles": rate_limiter.total_profiles,
        "total_errors": rate_limiter.total_errors,
        "duration_seconds": int(time.time() - rate_limiter.session_start),
    },
    "checkpoint": {
        "visited": list(visited),
        "queue": queue,
        "timestamp": datetime.now().isoformat(),
    }
}

print(json.dumps(output))
sys.stdout.flush()

emit_progress(f"Scraping complete. Found: {len(profiles)}, Errors: {len(errors)}, Duration: {output['stats']['duration_seconds']}s")
