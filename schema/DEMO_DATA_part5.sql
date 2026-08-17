-- ═══════════════════════════════════════════════════════════════════════════════
-- THEBOREDMONKEY — FULL DEMO DATA (Part 5: Links, Teams, Shortlist, Commercials)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 15. TRACKED LINKS
INSERT INTO cp_tracked_links (campaign_id, creator_id, deliverable_id, original_url, short_code, short_url, utm_source, utm_medium, utm_campaign, utm_content, clicks, unique_clicks, conversions, conversion_rate, last_clicked_at) VALUES
('11111111-1111-1111-1111-111111111111', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', 'https://www.amazon.in/Boat-Rockerz-550/dp/B09XYZ1234', 'tbm-tg-550', 'https://tbm.link/tbm-tg-550', 'technical_guruji', 'influencer', 'boat_rockerz_550', 'youtube_description', 45200, 38100, 1250, 3.28, '2026-07-20 18:00:00+05:30'),
('11111111-1111-1111-1111-111111111111', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '2d2d2d2d-2d2d-2d2d-2d2d-2d2d2d2d2d2d', 'https://www.amazon.in/Boat-Rockerz-550/dp/B09XYZ1234', 'tbm-tb-550', 'https://tbm.link/tbm-tb-550', 'tech_burner', 'influencer', 'boat_rockerz_550', 'youtube_shorts', 28900, 24500, 890, 3.63, '2026-07-18 20:00:00+05:30'),
('22222222-2222-2222-2222-222222222222', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', 'https://mamaearth.in/product/onion-hair-oil', 'tbm-aisha-mama', 'https://tbm.link/tbm-aisha-mama', 'aisha_sharma', 'influencer', 'mamaearth_monsoon', 'ig_reel_bio', 12400, 10200, 340, 3.33, '2026-08-01 12:00:00+05:30'),
('44444444-4444-4444-4444-444444444444', 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '7d7d7d7d-7d7d-7d7d-7d7d-7d7d7d7d7d7d', 'https://www.zomato.com/brands/pancakes', 'tbm-sanj-zomato', 'https://tbm.link/tbm-sanj-zomato', 'sanjana_ghosh', 'influencer', 'zomato_binge', 'ig_reel_bio', 18700, 15600, 520, 3.33, '2026-08-05 19:00:00+05:30')
ON CONFLICT DO NOTHING;

-- 16. LINK CLICKS (sample)
INSERT INTO cp_link_clicks (link_id, ip_address, user_agent, country, city, device, browser, clicked_at) VALUES
((SELECT id FROM cp_tracked_links WHERE short_code='tbm-tg-550'), '103.21.58.1', 'Mozilla/5.0 (Linux; Android 14)', 'India', 'Mumbai', 'Android', 'Chrome', '2026-07-16 10:00:00+05:30'),
((SELECT id FROM cp_tracked_links WHERE short_code='tbm-tg-550'), '103.21.58.2', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17)', 'India', 'Delhi', 'iPhone', 'Safari', '2026-07-16 14:00:00+05:30'),
((SELECT id FROM cp_tracked_links WHERE short_code='tbm-tg-550'), '49.36.128.1', 'Mozilla/5.0 (Windows NT 10.0)', 'India', 'Bangalore', 'Desktop', 'Chrome', '2026-07-17 09:00:00+05:30'),
((SELECT id FROM cp_tracked_links WHERE short_code='tbm-aisha-mama'), '103.21.58.5', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17)', 'India', 'Pune', 'iPhone', 'Instagram App', '2026-07-25 18:00:00+05:30'),
((SELECT id FROM cp_tracked_links WHERE short_code='tbm-aisha-mama'), '49.36.128.8', 'Mozilla/5.0 (Linux; Android 14)', 'India', 'Delhi', 'Android', 'Instagram App', '2026-07-26 12:00:00+05:30'),
((SELECT id FROM cp_tracked_links WHERE short_code='tbm-sanj-zomato'), '103.21.58.10', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17)', 'India', 'Mumbai', 'iPhone', 'Instagram App', '2026-08-04 11:00:00+05:30')
ON CONFLICT DO NOTHING;

-- 17. TEAM ASSIGNMENTS
INSERT INTO cp_team_assignments (campaign_id, user_id, role, assigned_sections) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand_solutions', ARRAY['brief','client_management']::TEXT[]),
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'campaign_manager', ARRAY['creators','deliverables','scripts']::TEXT[]),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'ir_executive', ARRAY['outreach','negotiation']::TEXT[]),
('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand_solutions', ARRAY['brief']::TEXT[]),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'campaign_manager', ARRAY['creators','deliverables']::TEXT[]),
('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'ir_executive', ARRAY['outreach']::TEXT[]),
('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand_solutions', ARRAY['brief','client_management']::TEXT[]),
('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'ir_executive', ARRAY['outreach','negotiation','creators']::TEXT[]),
('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand_solutions', ARRAY['brief','client_management']::TEXT[]),
('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'campaign_manager', ARRAY['creators','deliverables']::TEXT[])
ON CONFLICT (campaign_id, user_id) DO NOTHING;

-- 18. CREATOR SHORTLIST (links pool to campaigns)
INSERT INTO cp_creator_shortlist (id, campaign_id, pool_creator_id, quoted_cost, internal_cost, status, deliverables_count, total_views, total_likes, total_comments, avg_engagement, shortlisted_at) VALUES
('1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a', '11111111-1111-1111-1111-111111111111', '10101010-1010-1010-1010-101010101010', 150000, 80000, 'active', 1, 1450000, 58000, 2340, 4.10, '2026-07-03 10:00:00+05:30'),
('2b2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b', '11111111-1111-1111-1111-111111111111', '60606060-6060-6060-6060-606060606060', 120000, 70000, 'active', 1, 890000, 44500, 1200, 5.30, '2026-07-05 11:00:00+05:30'),
('3c3c3c3c-3c3c-3c3c-3c3c-3c3c3c3c3c3c', '11111111-1111-1111-1111-111111111111', '20202020-2020-2020-2020-202020202020', 200000, 120000, 'shortlisted', 0, 0, 0, 0, 0, '2026-07-02 15:00:00+05:30'),
('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', '22222222-2222-2222-2222-222222222222', '70707070-7070-7070-7070-707070707070', 35000, 18000, 'active', 2, 210000, 16800, 540, 8.80, '2026-07-18 12:00:00+05:30'),
('5e5e5e5e-5e5e-5e5e-5e5e-5e5e5e5e5e5e', '22222222-2222-2222-2222-222222222222', '50505050-5050-5050-5050-505050505050', 45000, 25000, 'negotiating', 0, 0, 0, 0, 0, '2026-07-22 10:00:00+05:30'),
('6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6f6f', '44444444-4444-4444-4444-444444444444', '50505050-5050-5050-5050-505050505050', 50000, 25000, 'active', 1, 345000, 24150, 890, 7.50, '2026-08-01 09:00:00+05:30'),
('7g7g7g7g-7g7g-7g7g-7g7g-7g7g7g7g7g7g', '44444444-4444-4444-4444-444444444444', '20202020-2020-2020-2020-202020202020', 200000, 120000, 'completed', 1, 520000, 36400, 1200, 7.50, '2026-08-01 10:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- 19. CREATOR HISTORY
INSERT INTO cp_creator_history (creator_pool_id, campaign_id, campaign_name, brand, platform, deliverable_type, quoted_cost, internal_cost, views, likes, comments, shares, engagement_rate, live_link, live_date, status, outcome) VALUES
('10101010-1010-1010-1010-101010101010', '11111111-1111-1111-1111-111111111111', 'Boat Rockerz 550 Summer Push', 'boAt', 'youtube_long', 'youtube_long', 150000, 80000, 1450000, 58000, 2340, 4500, 4.10, 'https://youtube.com/watch?v=demo_tg_550', '2026-07-15 09:00:00+05:30', 'completed', 'completed'),
('60606060-6060-6060-6060-606060606060', '11111111-1111-1111-1111-111111111111', 'Boat Rockerz 550 Summer Push', 'boAt', 'youtube_shorts', 'youtube_shorts', 120000, 70000, 890000, 44500, 1200, 3200, 5.30, 'https://youtube.com/shorts/demo_tb_550', '2026-07-15 10:00:00+05:30', 'completed', 'completed'),
('70707070-7070-7070-7070-707070707070', '22222222-2222-2222-2222-222222222222', 'Mamaearth Monsoon Hair Care', 'Mamaearth', 'instagram_reels', 'instagram_reels', 35000, 18000, 210000, 16800, 540, 1200, 8.80, 'https://instagram.com/reel/demo_aisha_mama', '2026-07-25 18:00:00+05:30', 'completed', 'completed'),
('50505050-5050-5050-5050-505050505050', '44444444-4444-4444-4444-444444444444', 'Zomato Weekend Binge Series', 'Zomato', 'instagram_reels', 'instagram_reels', 50000, 25000, 345000, 24150, 890, 2100, 7.50, 'https://instagram.com/reel/demo_sanj_zomato', '2026-08-03 18:00:00+05:30', 'completed', 'completed'),
('20202020-2020-2020-2020-202020202020', '44444444-4444-4444-4444-444444444444', 'Zomato Weekend Binge Series', 'Zomato', 'instagram_reels', 'instagram_reels', 200000, 120000, 520000, 36400, 1200, 3500, 7.50, 'https://instagram.com/reel/demo_praj_zomato', '2026-08-03 19:00:00+05:30', 'completed', 'completed')
ON CONFLICT DO NOTHING;

-- 20. CREATOR COMMERCIALS
INSERT INTO cp_creator_commercials (creator_pool_id, platform, deliverable_type, rate, currency, negotiable, min_rate, notes, effective_from) VALUES
('10101010-1010-1010-1010-101010101010', 'youtube', 'youtube_long', 150000, 'INR', true, 120000, 'Standard rate for long-form tech reviews', '2026-06-01'),
('10101010-1010-1010-1010-101010101010', 'youtube', 'youtube_shorts', 45000, 'INR', true, 35000, 'Shorts rate - higher engagement per view', '2026-06-01'),
('10101010-1010-1010-1010-101010101010', 'instagram', 'instagram_reels', 50000, 'INR', true, 40000, 'IG Reels rate', '2026-06-01'),
('20202020-2020-2020-2020-202020202020', 'youtube', 'youtube_long', 200000, 'INR', true, 160000, 'Premium lifestyle content rate', '2026-06-01'),
('20202020-2020-2020-2020-202020202020', 'instagram', 'instagram_reels', 80000, 'INR', true, 60000, 'IG Reels - high engagement audience', '2026-06-01'),
('30303030-3030-3030-3030-303030303030', 'youtube', 'youtube_long', 300000, 'INR', false, NULL, 'Non-negotiable - mega creator rate', '2026-06-01'),
('30303030-3030-3030-3030-303030303030', 'youtube', 'youtube_shorts', 80000, 'INR', true, 65000, 'Shorts rate for gaming content', '2026-06-01'),
('40404040-4040-4040-4040-404040404040', 'youtube', 'youtube_long', 180000, 'INR', true, 140000, 'Fitness podcast/interview rate', '2026-06-01'),
('50505050-5050-5050-5050-505050505050', 'youtube', 'youtube_long', 45000, 'INR', true, 35000, 'Food review rate', '2026-06-01'),
('50505050-5050-5050-5050-505050505050', 'instagram', 'instagram_reels', 18000, 'INR', true, 12000, 'Food reel rate', '2026-06-01'),
('60606060-6060-6060-6060-606060606060', 'youtube', 'youtube_long', 120000, 'INR', true, 90000, 'Tech review rate', '2026-06-01'),
('70707070-7070-7070-7070-707070707070', 'instagram', 'instagram_reels', 15000, 'INR', true, 10000, 'Beauty reel rate - rising creator', '2026-06-01'),
('80808080-8080-8080-8080-808080808080', 'youtube', 'youtube_long', 25000, 'INR', true, 18000, 'Motovlog rate', '2026-06-01')
ON CONFLICT DO NOTHING;
