-- ═══════════════════════════════════════════════════════════════════════════════
-- THEBOREDMONKEY — FULL DEMO DATA (Part 6: Scraper Pipeline)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 21. SESSION COOKIES
INSERT INTO cp_session_cookies (id, label, username, session_id, ds_user_id, csrftoken, status, requests_count, last_used_at, last_success_at, consecutive_errors) VALUES
('e0000001-0000-0000-0000-000000000001', 'Primary Account', 'apex_coders', 'demo_session_abc123xyz', '5432109876', 'csrf_demo_token_12345', 'active', 342, '2026-08-13 14:00:00+05:30', '2026-08-13 14:00:00+05:30', 0),
('e0000001-0000-0000-0000-000000000002', 'Backup Account', 'auto_beast97', '', '', '', 'expired', 156, '2026-08-10 18:00:00+05:30', '2026-08-09 12:00:00+05:30', 5)
ON CONFLICT (id) DO NOTHING;

-- 22. SCRAPE JOBS (3 jobs: completed, running, failed)
INSERT INTO cp_scrape_jobs (id, seed_handle, depth, max_profiles, status, progress, profiles_found, profiles_passed, profiles_failed, profiles_filtered, error_message, can_resume, daily_limit_remaining, started_at, completed_at) VALUES
('aa000001-0000-0000-0000-000000000001', '@technicalguruji', 2, 500, 'completed', 100, 347, 89, 258, 67, NULL, false, 4653, '2026-08-10 10:00:00+05:30', '2026-08-10 14:30:00+05:30'),
('aa000001-0000-0000-0000-000000000002', '@mostlysane', 3, 1000, 'running', 45, 210, 52, 158, 38, NULL, true, 4290, '2026-08-13 09:00:00+05:30', NULL),
('aa000001-0000-0000-0000-000000000003', '@CarryMinati', 2, 500, 'failed', 12, 58, 0, 58, 0, 'Session expired after 58 profiles. No working session available.', false, 4942, '2026-08-12 16:00:00+05:30', NULL)
ON CONFLICT (id) DO NOTHING;

-- 23. RAW CREATORS (sample scraped profiles)
INSERT INTO cp_raw_creators (id, handle, full_name, bio, profile_pic_url, is_verified, is_private, is_business, followers, following, posts_count, avg_views, avg_likes, avg_comments, engagement_rate, email, phone, website, category, source, source_job_id, status) VALUES
('bb000001-0000-0000-0000-000000000001', 'gadgetfreakofficial', 'Gadget Freak', 'Tech reviews | Unboxings | Gadgets under 5000', NULL, false, false, true, 125000, 890, 342, 45000, 2800, 120, 2.35, 'gadgetfreak@gmail.com', NULL, 'https://gadgetfreak.in', 'Technology', 'scraper', 'aa000001-0000-0000-0000-000000000001', 'filtered'),
('bb000001-0000-0000-0000-000000000002', 'delhi.foodie.girl', 'Priya Foodie', 'Delhi street food explorer | Food blogger | DM for collabs', NULL, false, false, true, 67000, 1200, 189, 28000, 3500, 95, 5.40, 'priya.food@gmail.com', NULL, NULL, 'Food & Drink', 'scraper', 'aa000001-0000-0000-0000-000000000001', 'filtered'),
('bb000001-0000-0000-0000-000000000003', 'fitness.boy.ravi', 'Ravi Fitness', 'Personal trainer | Fitness tips | Supplement reviews', NULL, false, false, false, 34000, 450, 267, 12000, 900, 45, 2.81, NULL, NULL, NULL, 'Health/Fitness', 'scraper', 'aa000001-0000-0000-0000-000000000001', 'raw'),
('bb000001-0000-0000-0000-000000000004', 'mumbai.beauty.queen', 'Sonia Beauty', 'Makeup artist | Beauty tips | Skincare routines', NULL, false, false, true, 89000, 670, 412, 35000, 4200, 180, 4.80, 'sonia.beauty@outlook.com', NULL, 'https://soniabeauty.com', 'Beauty', 'scraper', 'aa000001-0000-0000-0000-000000000002', 'filtered'),
('bb000001-0000-0000-0000-000000000005', 'tech.without.words', 'Tech Without Words', 'Gadget reviews in Hindi | No talking, just visuals', NULL, false, false, false, 156000, 340, 198, 89000, 5600, 220, 3.65, NULL, NULL, NULL, 'Technology', 'scraper', 'aa000001-0000-0000-0000-000000000001', 'filtered'),
('bb000001-0000-0000-0000-000000000006', 'private.account.001', 'Secret Profile', 'This is a private account', NULL, false, true, false, 2300, 150, 45, 0, 0, 0, 0, NULL, NULL, NULL, NULL, 'scraper', 'aa000001-0000-0000-0000-000000000002', 'rejected'),
('bb000001-0000-0000-0000-000000000007', 'bangalore.food.trail', 'Bangalore Food Trail', 'Street food | Restaurants | Food events in Bangalore', NULL, false, false, true, 45000, 780, 234, 18000, 2100, 85, 4.82, 'bngfood@gmail.com', NULL, NULL, 'Food & Drink', 'scraper', 'aa000001-0000-0000-0000-000000000002', 'raw'),
('bb000001-0000-0000-0000-000000000008', 'auto.vlog.india', 'AutoVlog India', 'Car and bike reviews | Automotive content', NULL, false, false, false, 78000, 420, 156, 32000, 2400, 98, 3.20, 'autovlog@gmail.com', NULL, 'https://autovlog.in', 'Automotive', 'scraper', 'aa000001-0000-0000-0000-000000000001', 'filtered'),
('bb000001-0000-0000-0000-000000000009', 'fake.followers.001', 'Mr Popularity', 'Influencer | Lifestyle | Travel', NULL, false, false, true, 500000, 2100, 89, 1200, 300, 15, 0.26, NULL, NULL, NULL, 'Lifestyle', 'scraper', 'aa000001-0000-0000-0000-000000000003', 'rejected'),
('bb000001-0000-0000-0000-000000000010', 'travel.solo.ritika', 'Ritika Travels', 'Solo female traveler | Budget travel | Hostel reviews', NULL, false, false, false, 34000, 560, 312, 15000, 1800, 72, 5.47, 'ritika.travel@gmail.com', NULL, NULL, 'Travel', 'scraper', 'aa000001-0000-0000-0000-000000000002', 'raw')
ON CONFLICT (handle) DO NOTHING;

-- 24. FILTERED CREATORS (passed both passes)
INSERT INTO cp_filtered_creators (id, raw_creator_id, handle, full_name, bio, profile_pic_url, is_verified, email, phone, website, followers, following, posts_count, avg_views, avg_likes, avg_comments, engagement_rate, views_to_followers_ratio, category, tier, score_breakdown, score_passed, outreach_status, campaign_id) VALUES
('cc000001-0000-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000001', 'gadgetfreakofficial', 'Gadget Freak', 'Tech reviews | Unboxings | Gadgets under 5000', NULL, false, 'gadgetfreak@gmail.com', NULL, 'https://gadgetfreak.in', 125000, 890, 342, 45000, 2800, 120, 2.35, 0.360, 'Technology', 'mid', '{"pass1":85,"pass2":92,"total":88}', true, 'not_contacted', NULL),
('cc000001-0000-0000-0000-000000000002', 'bb000001-0000-0000-0000-000000000002', 'delhi.foodie.girl', 'Priya Foodie', 'Delhi street food explorer | Food blogger', NULL, false, 'priya.food@gmail.com', NULL, NULL, 67000, 1200, 189, 28000, 3500, 95, 5.40, 0.418, 'Food & Drink', 'micro', '{"pass1":90,"pass2":95,"total":92}', true, 'contacted', '44444444-4444-4444-4444-444444444444'),
('cc000001-0000-0000-0000-000000000003', 'bb000001-0000-0000-0000-000000000004', 'mumbai.beauty.queen', 'Sonia Beauty', 'Makeup artist | Beauty tips | Skincare', NULL, false, 'sonia.beauty@outlook.com', NULL, 'https://soniabeauty.com', 89000, 670, 412, 35000, 4200, 180, 4.80, 0.393, 'Beauty', 'mid', '{"pass1":88,"pass2":90,"total":89}', true, 'not_contacted', NULL),
('cc000001-0000-0000-0000-000000000004', 'bb000001-0000-0000-0000-000000000005', 'tech.without.words', 'Tech Without Words', 'Gadget reviews in Hindi | No talking', NULL, false, NULL, NULL, NULL, 156000, 340, 198, 89000, 5600, 220, 3.65, 0.571, 'Technology', 'mid', '{"pass1":92,"pass2":88,"total":90}', true, 'not_contacted', NULL),
('cc000001-0000-0000-0000-000000000005', 'bb000001-0000-0000-0000-000000000008', 'auto.vlog.india', 'AutoVlog India', 'Car and bike reviews | Automotive', NULL, false, 'autovlog@gmail.com', NULL, 'https://autovlog.in', 78000, 420, 156, 32000, 2400, 98, 3.20, 0.410, 'Automotive', 'micro', '{"pass1":86,"pass2":82,"total":84}', true, 'responded', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (handle) DO NOTHING;

-- 25. SCRAPE ERRORS
INSERT INTO cp_scrape_errors (job_id, handle, error_type, error_message, created_at) VALUES
('aa000001-0000-0000-0000-000000000003', 'popular_creator_01', 'checkpoint_required', 'Instagram requires security checkpoint. Session invalid.', '2026-08-12 16:15:00+05:30'),
('aa000001-0000-0000-0000-000000000003', 'popular_creator_02', 'rate_limit', 'Too many requests. IP temporarily blocked.', '2026-08-12 16:20:00+05:30'),
('aa000001-0000-0000-0000-000000000002', 'private_account_01', 'private_profile', 'Profile is private. Cannot scrape.', '2026-08-13 09:45:00+05:30'),
('aa000001-0000-0000-0000-000000000002', 'deleted_account_01', 'not_found', 'Profile does not exist or has been deleted.', '2026-08-13 10:12:00+05:30'),
('aa000001-0000-0000-0000-000000000001', 'rate_limited_01', 'rate_limit', 'Request timed out after 30 seconds.', '2026-08-10 12:00:00+05:30')
ON CONFLICT DO NOTHING;

-- 26. CAMPAIGN ROLES
INSERT INTO campaign_roles (user_id, campaign_id, role) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'brand_solutions'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'campaign_manager'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'ir_executive'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'brand_solutions'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'campaign_manager'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'brand_solutions'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'ir_executive'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'brand_solutions'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'campaign_manager')
ON CONFLICT (user_id, campaign_id) DO NOTHING;
