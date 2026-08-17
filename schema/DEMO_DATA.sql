-- ═══════════════════════════════════════════════════════════════════════════════
-- THEBOREDMONKEY — FULL DEMO DATA (Part 1: Core Tables)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. CAMPAIGNS
INSERT INTO cp_campaigns (id, name, brand, campaign_type, objective, platform_mix, deliverable_types, budget, start_date, go_live_date, status, sla_client_feedback_hours, sla_script_days, sla_content_days, sla_onboard_to_live_days, brief_mandatories, created_by) VALUES
('11111111-1111-1111-1111-111111111111', 'Boat Rockerz 550 Summer Push', 'boAt', 'product_launch', 'Drive awareness for new Boat Rockerz 550 headphone launch. Target Gen Z audience.', ARRAY['youtube_long','youtube_shorts','instagram_reels']::TEXT[], ARRAY['youtube_long','youtube_shorts','instagram_reels']::TEXT[], 850000.00, '2026-07-01', '2026-07-20', 'active', 48, 5, 7, 15, 'Product in first 10s. Use #BoatRockerz550. No competitors. Tag @boaboraindia.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('22222222-2222-2222-2222-222222222222', 'Mamaearth Monsoon Hair Care', 'Mamaearth', 'brand_awareness', 'Promote Mamaearth onion hair oil during monsoon. Hair fall solutions focus.', ARRAY['youtube_long','instagram_reels','instagram_stories']::TEXT[], ARRAY['youtube_long','instagram_reels','instagram_stories']::TEXT[], 1200000.00, '2026-07-15', '2026-08-05', 'active', 48, 5, 7, 15, 'Before/after results mandatory. Use #MamaearthOnion. Show product application.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('33333333-3333-3333-3333-333333333333', 'Noise ColorFit Pro 5 Launch', 'Noise', 'product_launch', 'Unboxing and review of Noise ColorFit Pro 5 smartwatch. Fitness community.', ARRAY['youtube_long','youtube_shorts','instagram_reels']::TEXT[], ARRAY['youtube_long','youtube_shorts']::TEXT[], 650000.00, '2026-08-01', '2026-08-20', 'draft', 72, 7, 10, 20, 'Show unboxing. Highlight 5 features. Use #NoiseColorFit. No Apple Watch comparisons.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('44444444-4444-4444-4444-444444444444', 'Zomato Weekend Binge Series', 'Zomato', 'content_series', 'Weekly food review series. 4 episodes over August. Street food focus.', ARRAY['instagram_reels','instagram_stories','tiktok']::TEXT[], ARRAY['instagram_reels','instagram_stories']::TEXT[], 400000.00, '2026-08-01', '2026-08-15', 'active', 24, 3, 5, 10, 'Show Zomato app ordering. Use #ZomatoBinge. Food must be real orders. Tag @zomato.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('55555555-5555-5555-5555-555555555555', 'Cred Q3 Brand Blitz', 'Cred', 'brand_awareness', 'Cred premium lifestyle positioning. Target high-income millennials.', ARRAY['youtube_long','instagram_reels']::TEXT[], ARRAY['youtube_long','instagram_reels']::TEXT[], 2500000.00, '2026-07-20', '2026-08-15', 'paused', 48, 7, 10, 20, 'Lifestyle content. Show Cred app payment flow. Premium aesthetics only.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- 2. CREATOR POOL (8 diverse creators)
INSERT INTO cp_creator_pool (id, name, email, phone, whatsapp, location, languages, youtube_url, youtube_handle, instagram_url, instagram_handle, tiktok_url, twitter_url, niche, sub_niche, content_type, subscribers, avg_views, avg_engagement, avg_likes, avg_comments, total_videos, total_views, country, city, gender, age_range, languages_spoken, rate_card, internal_rate, tier, brand_safety, notes, tags, status, source, added_by) VALUES
('10101010-1010-1010-1010-101010101010', 'Technical Guruji', 'tg@creators.in', '+919876543210', '+919876543210', 'Mumbai, India', ARRAY['Hindi','English']::TEXT[], 'https://youtube.com/@technicalguruji', '@technicalguruji', 'https://instagram.com/technicalguruji', '@technicalguruji', NULL, NULL, ARRAY['tech','gadgets']::TEXT[], ARRAY['smartphones','audio']::TEXT[], ARRAY['review','unboxing','tutorial']::TEXT[], 2300000, 1800000, 4.2, 75600, 3200, 890, 1600000000, 'India', 'Mumbai', 'male', '28-35', ARRAY['Hindi','English']::TEXT[], '{"youtube_long":150000,"youtube_shorts":45000,"instagram_reels":50000}', 80000, 'mega', 'safe', 'Top tech creator. Very reliable. Premium brand friendly.', ARRAY['tech','premium','reliable']::TEXT[], 'active', 'manual', 'Haji Karim'),
('20202020-2020-2020-2020-202020202020', 'Prajakta Koli', 'praj@creators.in', '+919876543211', '+919876543211', 'Mumbai, India', ARRAY['Hindi','English','Marathi']::TEXT[], 'https://youtube.com/@mostlysane', '@mostlysane', 'https://instagram.com/prajaktakoli', '@prajaktakoli', NULL, NULL, ARRAY['lifestyle','comedy','entertainment']::TEXT[], ARRAY['daily_vlogs','sketches']::TEXT[], ARRAY['vlog','sketch','collab']::TEXT[], 750000, 900000, 6.8, 61200, 2100, 450, 405000000, 'India', 'Mumbai', 'female', '25-30', ARRAY['Hindi','English','Marathi']::TEXT[], '{"youtube_long":200000,"youtube_shorts":60000,"instagram_reels":80000}', 120000, 'macro', 'safe', 'MostlySane. Great for lifestyle brands. Very brand-safe.', ARRAY['lifestyle','comedy','female']::TEXT[], 'active', 'manual', 'Haji Karim'),
('30303030-3030-3030-3030-303030303030', 'CarryMinati', 'carry@creators.in', '+919876543212', '+919876543212', 'Delhi, India', ARRAY['Hindi','English']::TEXT[], 'https://youtube.com/@CarryMinati', '@CarryMinati', 'https://instagram.com/ CarryMinati', '@carryminati', NULL, NULL, ARRAY['comedy','gaming','entertainment']::TEXT[], ARRAY['roasts','gaming']::TEXT[], ARRAY['roast','gaming','vlog']::TEXT[], 4300000, 5000000, 5.5, 275000, 8900, 620, 2150000000, 'India', 'Delhi', 'male', '24-30', ARRAY['Hindi','English']::TEXT[], '{"youtube_long":300000,"youtube_shorts":80000,"instagram_reels":100000}', 200000, 'mega', 'caution', 'Largest Hindi creator. edgy humor - some brands may not fit.', ARRAY['comedy','gaming','young']::TEXT[], 'active', 'manual', 'Haji Karim'),
('40404040-4040-4040-4040-404040404040', 'BeerBiceps', 'bbsp @creators.in', '+919876543213', '+919876543213', 'Mumbai, India', ARRAY['Hindi','English']::TEXT[], 'https://youtube.com/@BeerBiceps', '@BeerBiceps', 'https://instagram.com/BeerBiceps', '@beerbiceps', NULL, NULL, ARRAY['fitness','health','wellness']::TEXT[], ARRAY['workout','nutrition','mindset']::TEXT[], ARRAY['tutorial','interview','podcast']::TEXT[], 1200000, 800000, 3.8, 30400, 1800, 780, 624000000, 'India', 'Mumbai', 'male', '28-35', ARRAY['Hindi','English']::TEXT[], '{"youtube_long":180000,"youtube_shorts":50000,"instagram_reels":65000}', 100000, 'macro', 'safe', 'Health/fitness niche. Great for supplement and health brands.', ARRAY['fitness','health','podcast']::TEXT[], 'active', 'manual', 'Haji Karim'),
('50505050-5050-5050-5050-505050505050', 'Sanjana Ghosh', 'sanj@creators.in', '+919876543214', '+919876543214', 'Bangalore, India', ARRAY['Kannada','English','Hindi']::TEXT[], 'https://youtube.com/@saborwithsanj', '@saborwithsanj', 'https://instagram.com/sanjanaghosh', '@sanjanaghosh', NULL, NULL, ARRAY['food','lifestyle','travel']::TEXT[], ARRAY['restaurant_reviews','street_food']::TEXT[], ARRAY['review','vlog','reel']::TEXT[], 280000, 350000, 7.2, 25200, 980, 310, 108500000, 'India', 'Bangalore', 'female', '24-28', ARRAY['Kannada','English','Hindi']::TEXT[], '{"youtube_long":45000,"youtube_shorts":12000,"instagram_reels":18000}', 25000, 'mid', 'safe', 'Food and travel influencer. Perfect for restaurant and food brands.', ARRAY['food','travel','bangalore']::TEXT[], 'active', 'manual', 'Haji Karim'),
('60606060-6060-6060-6060-606060606060', 'Tech Burner', 'tb@creators.in', '+919876543215', '+919876543215', 'Delhi, India', ARRAY['Hindi','English']::TEXT[], 'https://youtube.com/@TechBurner', '@TechBurner', 'https://instagram.com/techburner', '@techburner', NULL, NULL, ARRAY['tech','gadgets']::TEXT[], ARRAY['smartphones','accessories']::TEXT[], ARRAY['review','unboxing','shorts']::TEXT[], 1100000, 1500000, 4.5, 67500, 2800, 520, 780000000, 'India', 'Delhi', 'male', '25-30', ARRAY['Hindi','English']::TEXT[], '{"youtube_long":120000,"youtube_shorts":35000,"instagram_reels":40000}', 70000, 'macro', 'safe', 'Tech reviewer with high engagement. Great for gadget launches.', ARRAY['tech','reviewer','gadgets']::TEXT[], 'active', 'manual', 'Haji Karim'),
('70707070-7070-7070-7070-707070707070', 'Aisha Sharma', 'aisha@creators.in', '+919876543216', '+919876543216', 'Delhi, India', ARRAY['Hindi','English']::TEXT[], 'https://youtube.com/@aishalifestyle', '@aishalifestyle', 'https://instagram.com/aishasharma', '@aishasharma', NULL, NULL, ARRAY['beauty','fashion','lifestyle']::TEXT[], ARRAY['skincare','makeup','ootd']::TEXT[], ARRAY['tutorial','review','haul']::TEXT[], 95000, 120000, 8.5, 10200, 450, 180, 21600000, 'India', 'Delhi', 'female', '22-26', ARRAY['Hindi','English']::TEXT[], '{"youtube_long":35000,"youtube_shorts":10000,"instagram_reels":15000}', 18000, 'mid', 'safe', 'Beauty and fashion niche. High engagement rate. Rising creator.', ARRAY['beauty','fashion','rising']::TEXT[], 'active', 'bulk', 'Sarah Khan'),
('80808080-8080-8080-8080-808080808080', 'Rohit Zone', 'rohit@creators.in', '+919876543217', '+919876543217', 'Pune, India', ARRAY['Hindi','English','Marathi']::TEXT[], 'https://youtube.com/@rohitzonemotovlogs', '@rohitzonemotovlogs', 'https://instagram.com/rohitzone', '@rohitzone', NULL, NULL, ARRAY['automotive','travel']::TEXT[], ARRAY['motorcycles','road_trips']::TEXT[], ARRAY['vlog','review','motovlog']::TEXT[], 62000, 85000, 6.0, 5100, 320, 240, 20400000, 'India', 'Pune', 'male', '26-32', ARRAY['Hindi','English','Marathi']::TEXT[], '{"youtube_long":25000,"youtube_shorts":8000,"instagram_reels":10000}', 12000, 'micro', 'safe', 'Motorcycle and travel niche. Ideal for auto and travel brands.', ARRAY['auto','travel','micro']::TEXT[], 'active', 'scraper', 'Rahul Mehta')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- THEBOREDMONKEY — FULL DEMO DATA (Part 2: Campaign Creators + Deliverables)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 3. CAMPAIGN CREATORS (linked to campaigns)
INSERT INTO cp_creators (id, campaign_id, channel_name, channel_url, channel_handle, platform, profile_image_url, subscribers, avg_views, engagement_rate, internal_cost, quoted_cost, status, rejection_reason, onboarded_at, go_live_deadline, client_action, client_remark, added_by) VALUES
-- Campaign 1: Boat Rockerz
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'Technical Guruji', 'https://youtube.com/@technicalguruji', '@technicalguruji', 'youtube', '', 2300000, 1800000, 4.2, 80000, 150000, 'active', NULL, '2026-07-10', '2026-07-20', 'approved', 'Great fit for tech audio product', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '11111111-1111-1111-1111-111111111111', 'Tech Burner', 'https://youtube.com/@TechBurner', '@TechBurner', 'youtube', '', 1100000, 1500000, 4.5, 70000, 120000, 'active', NULL, '2026-07-12', '2026-07-22', 'approved', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '11111111-1111-1111-1111-111111111111', 'Prajakta Koli', 'https://youtube.com/@mostlysane', '@prajaktakoli', 'instagram', '', 750000, 900000, 6.8, 120000, 200000, 'shortlisted', NULL, NULL, NULL, NULL, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
-- Campaign 2: Mamaearth
('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '22222222-2222-2222-2222-222222222222', 'Aisha Sharma', 'https://instagram.com/aishasharma', '@aishasharma', 'instagram', '', 95000, 120000, 8.5, 18000, 35000, 'active', NULL, '2026-07-20', '2026-08-05', 'approved', 'Perfect beauty niche fit', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '22222222-2222-2222-2222-222222222222', 'Sanjana Ghosh', 'https://youtube.com/@saborwithsanj', '@sanjanaghosh', 'youtube', '', 280000, 350000, 7.2, 25000, 45000, 'negotiating', NULL, NULL, NULL, NULL, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
-- Campaign 3: Noise
('f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', '33333333-3333-3333-3333-333333333333', 'Rohit Zone', 'https://youtube.com/@rohitzonemotovlogs', '@rohitzone', 'youtube', '', 62000, 85000, 6.0, 12000, 25000, 'client_review', NULL, NULL, NULL, 'sent', 'Waiting for client approval', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
-- Campaign 4: Zomato
('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '44444444-4444-4444-4444-444444444444', 'Sanjana Ghosh', 'https://youtube.com/@saborwithsanj', '@sanjanaghosh', 'instagram', '', 280000, 350000, 7.2, 25000, 50000, 'active', NULL, '2026-08-05', '2026-08-15', 'approved', 'Food creator is perfect', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8b8', '44444444-4444-4444-4444-444444444444', 'Prajakta Koli', 'https://youtube.com/@mostlysane', '@prajaktakoli', 'instagram', '', 750000, 900000, 6.8, 120000, 200000, 'completed', NULL, '2026-08-01', '2026-08-10', 'approved', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
-- Campaign 5: Cred
('c9c9c9c9-c9c9-c9c9-c9c9-c9c9c9c9c9c9', '55555555-5555-5555-5555-555555555555', 'CarryMinati', 'https://youtube.com/@CarryMinati', '@carryminati', 'youtube', '', 4300000, 5000000, 5.5, 200000, 300000, 'shortlisted', NULL, NULL, NULL, NULL, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', '55555555-5555-5555-5555-555555555555', 'BeerBiceps', 'https://youtube.com/@BeerBiceps', '@beerbiceps', 'youtube', '', 1200000, 800000, 3.8, 100000, 180000, 'rejected', 'Brand tone mismatch - too fitness focused', NULL, NULL, NULL, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- 4. DELIVERABLES (16 deliverables across all campaigns)
INSERT INTO cp_deliverables (id, creator_id, campaign_id, platform, status, live_link, views, likes, comments, shares, engagement_rate, script_current_version, product_name, product_status, product_tracking_number, product_carrier, created_at) VALUES
-- Campaign 1 deliverables
('1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'youtube_long', 'live', 'https://youtube.com/watch?v=demo_tg_550', 1450000, 58000, 2340, 4500, 4.1, 1, 'Boat Rockerz 550', 'delivered', 'TRK123456789', 'Delhivery', '2026-07-05'),
('2d2d2d2d-2d2d-2d2d-2d2d-2d2d2d2d2d2d', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '11111111-1111-1111-1111-111111111111', 'youtube_shorts', 'live', 'https://youtube.com/shorts/demo_tb_550', 890000, 44500, 1200, 3200, 5.3, 1, 'Boat Rockerz 550', 'delivered', 'TRK987654321', 'BlueDart', '2026-07-08'),
('3d3d3d3d-3d3d-3d3d-3d3d-3d3d3d3d3d3d', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '11111111-1111-1111-1111-111111111111', 'instagram_reels', 'in_review', NULL, 0, 0, 0, 0, 0, 2, 'Boat Rockerz 550', 'shipped', 'TRK456789123', 'Ekart', '2026-07-15'),
-- Campaign 2 deliverables
('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '22222222-2222-2222-2222-222222222222', 'instagram_reels', 'approved', 'https://instagram.com/reel/demo_aisha_mama', 210000, 16800, 540, 1200, 8.8, 1, 'Mamaearth Onion Hair Oil', 'delivered', 'TRK789123456', 'XpressBees', '2026-07-18'),
('5d5d5d5d-5d5d-5d5d-5d5d-5d5d5d5d5d5d', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '22222222-2222-2222-2222-222222222222', 'youtube_long', 'script_pending', NULL, 0, 0, 0, 0, 0, 0, 'Mamaearth Onion Hair Oil', 'ordered', NULL, NULL, '2026-07-22'),
('6d6d6d6d-6d6d-6d6d-6d6d-6d6d6d6d6d6d', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '22222222-2222-2222-2222-222222222222', 'instagram_stories', 'filming', NULL, 0, 0, 0, 0, 0, 1, 'Mamaearth Onion Hair Oil', 'delivered', 'TRK321654987', 'Ekart', '2026-07-20'),
-- Campaign 4 deliverables
('7d7d7d7d-7d7d-7d7d-7d7d-7d7d7d7d7d7d', 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '44444444-4444-4444-4444-444444444444', 'instagram_reels', 'live', 'https://instagram.com/reel/demo_sanj_zomato', 345000, 24150, 890, 2100, 7.5, 1, NULL, 'not_required', NULL, NULL, '2026-08-03'),
('8d8d8d8d-8d8d-8d8d-8d8d-8d8d8d8d8d8d', 'b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8b8', '44444444-4444-4444-4444-444444444444', 'instagram_reels', 'live', 'https://instagram.com/reel/demo_praj_zomato', 520000, 36400, 1200, 3500, 7.5, 1, NULL, 'not_required', NULL, NULL, '2026-08-01')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- THEBOREDMONKEY — FULL DEMO DATA (Part 3: Negotiation, Status History, Scripts)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 5. NEGOTIATION LOG
INSERT INTO cp_negotiation_log (creator_id, campaign_id, round_number, cost_offered, cost_returned, remarks, offered_by_role, offered_by_user, created_at) VALUES
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 1, 120000, 150000, 'Initial offer too low, creator countered', 'ir_executive', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-03 10:00:00+05:30'),
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 2, 140000, 150000, 'Final round - agreed at 150k', 'campaign_manager', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-04 14:00:00+05:30'),
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '11111111-1111-1111-1111-111111111111', 1, 100000, 120000, 'Creator accepted 120k after initial 100k', 'ir_executive', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-05 11:00:00+05:30'),
('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '22222222-2222-2222-2222-222222222222', 1, 20000, 45000, 'Creator asking 45k, we offered 20k', 'ir_executive', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-25 09:00:00+05:30'),
('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '22222222-2222-2222-2222-222222222222', 2, 30000, 40000, 'Counter at 40k, we offered 30k', 'campaign_manager', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-26 16:00:00+05:30'),
('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', '55555555-5555-5555-5555-555555555555', 1, 150000, 180000, 'Rejected - brand tone mismatch, no further negotiation', 'ir_executive', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-28 12:00:00+05:30')
ON CONFLICT DO NOTHING;

-- 6. STATUS HISTORY
INSERT INTO cp_status_history (entity_type, entity_id, campaign_id, old_status, new_status, changed_by, changed_at, remarks) VALUES
('campaign', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'draft', 'active', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-07-01 10:00:00+05:30', 'Campaign launched'),
('creator', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'shortlisted', 'negotiating', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-03 10:00:00+05:30', 'Negotiation started'),
('creator', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'negotiating', 'onboarded', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-05 15:00:00+05:30', 'Creator onboarded at 150k'),
('deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 'pending', 'script_pending', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-06 09:00:00+05:30', 'Script requested'),
('deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 'script_pending', 'script_approved', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-08 11:00:00+05:30', 'Script approved'),
('deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 'script_approved', 'filming', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-09 10:00:00+05:30', 'Creator started filming'),
('deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 'filming', 'in_review', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-12 16:00:00+05:30', 'Video submitted for review'),
('deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 'in_review', 'approved', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-14 14:00:00+05:30', 'Video approved by brand'),
('deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 'approved', 'live', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-07-15 09:00:00+05:30', 'Video published on YouTube'),
('campaign', '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'active', 'paused', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-08-01 10:00:00+05:30', 'Campaign paused - budget review')
ON CONFLICT DO NOTHING;

-- 7. SCRIPT VERSIONS
INSERT INTO cp_script_versions (id, deliverable_id, campaign_id, version_number, content_text, status, feedback_remark, created_by, created_at) VALUES
('a0000001-0000-0000-0000-000000000001', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 1, 'Hey guys! Today I have the brand new Boat Rockerz 550. These are absolutely insane headphones with 40mm drivers and 20 hour battery life...', 'approved', '', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-06 10:00:00+05:30'),
('a0000001-0000-0000-0000-000000000002', '2d2d2d2d-2d2d-2d2d-2d2d-2d2d2d2d2d2d', '11111111-1111-1111-1111-111111111111', 1, 'Boat Rockerz 550 in 60 seconds! Best budget headphones under 2000?', 'approved', '', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-09 11:00:00+05:30'),
('a0000001-0000-0000-0000-000000000003', '3d3d3d3d-3d3d-3d3d-3d3d-3d3d3d3d3d3d', '11111111-1111-1111-1111-111111111111', 1, 'Unboxing the Boat Rockerz 550! Love the matte finish...', 'feedback', 'Please add more emphasis on bass quality', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-16 14:00:00+05:30'),
('a0000001-0000-0000-0000-000000000004', '3d3d3d3d-3d3d-3d3d-3d3d-3d3d3d3d3d3d', '11111111-1111-1111-1111-111111111111', 2, 'Unboxing the Boat Rockerz 550! The bass on these is incredible - 40mm drivers deliver deep, punchy bass...', 'sent_for_approval', '', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-17 10:00:00+05:30'),
('a0000001-0000-0000-0000-000000000005', '5d5d5d5d-5d5d-5d5d-5d5d-5d5d5d5d5d5d', '22222222-2222-2222-2222-222222222222', 1, 'Monsoon hair care routine with Mamaearth Onion Hair Oil. I have been using this for 3 weeks and the results...', 'draft', '', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-25 12:00:00+05:30')
ON CONFLICT DO NOTHING;

-- 8. BRIEF VERSIONS
INSERT INTO cp_brief_versions (id, campaign_id, version_number, objective, mandatories, platform_mix, deliverable_types, budget, go_live_date, notes, changed_by, changed_by_name, change_reason, created_at) VALUES
('b0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1, 'Drive awareness for Boat Rockerz 550', 'Product in frame. #BoatRockerz550', ARRAY['youtube_long','youtube_shorts']::TEXT[], ARRAY['youtube_long','youtube_shorts']::TEXT[], 700000.00, '2026-07-20', 'Initial brief', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Haji Karim', 'Initial brief creation', '2026-07-01 09:00:00+05:30'),
('b0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 2, 'Drive awareness for Boat Rockerz 550. Gen Z focus.', 'Product in first 10s. #BoatRockerz550 #SoundOfSilence. No competitor mentions.', ARRAY['youtube_long','youtube_shorts','instagram_reels']::TEXT[], ARRAY['youtube_long','youtube_shorts','instagram_reels']::TEXT[], 850000.00, '2026-07-20', 'Client requested Instagram Reels addition and increased budget', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Haji Karim', 'Client feedback - add Instagram Reels', '2026-07-02 11:00:00+05:30'),
('b0000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 1, 'Promote Mamaearth onion hair oil during monsoon', 'Before/after results. #MamaearthOnion. Show product application.', ARRAY['youtube_long','instagram_reels','instagram_stories']::TEXT[], ARRAY['youtube_long','instagram_reels','instagram_stories']::TEXT[], 1200000.00, '2026-08-05', 'Monsoon hair care campaign', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Haji Karim', 'Initial brief', '2026-07-15 10:00:00+05:30')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- THEBOREDMONKEY — FULL DEMO DATA (Part 4: Notifications, Activity, Client Users)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 9. NOTIFICATIONS
INSERT INTO cp_notifications (user_id, campaign_id, type, title, body, entity_type, entity_id, is_read, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'status_change', 'Technical Guruji went live!', 'Deliverable for Boat Rockerz 550 is now live on YouTube.', 'deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', true, '2026-07-15 09:30:00+05:30'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'escalation', 'Script feedback needed', 'Prajakta Koli script version 2 is pending approval since 2 days.', 'script', 'a0000001-0000-0000-0000-000000000003', false, '2026-07-18 10:00:00+05:30'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'assignment', 'New creator assigned', 'Sanjana Ghosh has been assigned to Mamaearth campaign.', 'creator', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', false, '2026-07-22 11:00:00+05:30'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'status_change', 'Zomato Episode 1 live', 'Sanjana Ghosh Zomato reel is now live with 345k views.', 'deliverable', '7d7d7d7d-7d7d-7d7d-7d7d-7d7d7d7d7d7d', true, '2026-08-03 18:00:00+05:30'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'deadline', 'Cred campaign deadline approaching', 'Go-live date for Cred Q3 Blitz is Aug 15. No creators onboarded yet.', 'campaign', '55555555-5555-5555-5555-555555555555', false, '2026-08-10 09:00:00+05:30'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'mention', 'Client approved deliverable', 'Boat Rockerz YouTube video approved by client.', 'deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', true, '2026-07-14 14:30:00+05:30')
ON CONFLICT DO NOTHING;

-- 10. ACTIVITY FEED
INSERT INTO cp_activity_feed (campaign_id, actor_user_id, actor_role, actor_name, action_type, entity_type, entity_id, entity_name, details, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand_solutions', 'Haji Karim', 'created', 'campaign', '11111111-1111-1111-1111-111111111111', 'Boat Rockerz 550 Summer Push', '{"budget":850000,"brand":"boAt"}', '2026-07-01 10:00:00+05:30'),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'ir_executive', 'Rahul Mehta', 'status_change', 'creator', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Technical Guruji', '{"old_status":"shortlisted","new_status":"negotiating"}', '2026-07-03 10:00:00+05:30'),
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'campaign_manager', 'Sarah Khan', 'cost_edit', 'creator', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Technical Guruji', '{"old_cost":120000,"new_cost":150000,"field":"quoted_cost"}', '2026-07-04 14:00:00+05:30'),
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'campaign_manager', 'Sarah Khan', 'status_change', 'deliverable', '1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', 'TG YouTube Long - Boat Rockerz', '{"old_status":"in_review","new_status":"approved"}', '2026-07-14 14:00:00+05:30'),
('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand_solutions', 'Haji Karim', 'created', 'campaign', '22222222-2222-2222-2222-222222222222', 'Mamaearth Monsoon Hair Care', '{"budget":1200000,"brand":"Mamaearth"}', '2026-07-15 10:00:00+05:30'),
('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'ir_executive', 'Rahul Mehta', 'status_change', 'deliverable', '7d7d7d7d-7d7d-7d7d-7d7d-7d7d7d7d7d7d', 'Sanjana IG Reel - Zomato', '{"old_status":"approved","new_status":"live","views":345000}', '2026-08-03 18:00:00+05:30'),
('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand_solutions', 'Haji Karim', 'status_change', 'campaign', '55555555-5555-5555-5555-555555555555', 'Cred Q3 Brand Blitz', '{"old_status":"active","new_status":"paused","reason":"budget review"}', '2026-08-01 10:00:00+05:30'),
('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'campaign_manager', 'Sarah Khan', 'comment', 'creator', 'b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8b8', 'Prajakta Koli', '{"comment":"Episode 1 completed and live! 520k views in 24hrs."}', '2026-08-03 20:00:00+05:30')
ON CONFLICT DO NOTHING;

-- 11. CLIENT USERS
INSERT INTO cp_client_users (id, campaign_id, email, name, password_hash, brand_name, is_active, invite_accepted_at) VALUES
('f0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'marketing@boat-lifestyle.com', 'Priya Verma', 'demo_client_hash', 'boAt', true, '2026-07-02 15:00:00+05:30'),
('f0000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'campaigns@mamaearth.in', 'Ankit Gupta', 'demo_client_hash', 'Mamaearth', true, '2026-07-16 12:00:00+05:30'),
('f0000001-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'social@zomato.com', 'Neha Singh', 'demo_client_hash', 'Zomato', true, '2026-08-02 10:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- 12. EMAIL LOG
INSERT INTO cp_email_log (campaign_id, to_email, to_role, template, subject, body, scrubbed, sent_at) VALUES
('11111111-1111-1111-1111-111111111111', 'marketing@boat-lifestyle.com', 'client', 'deliverable_approval', 'Action Required: Approve Boat Rockerz Script', 'Hi Priya, Please review the script for Technical Guruji deliverable. Link: https://panel.theboredmonkey.com/deliverables/1d1d1d1d', false, '2026-07-10 09:00:00+05:30'),
('11111111-1111-1111-1111-111111111111', 'marketing@boat-lifestyle.com', 'client', 'deliverable_live', 'Video Live: Technical Guruji - Boat Rockerz 550', 'Hi Priya, The YouTube video is now live! Views: 1.45M. Link: https://youtube.com/watch?v=demo_tg_550', false, '2026-07-15 10:00:00+05:30'),
('22222222-2222-2222-2222-222222222222', 'campaigns@mamaearth.in', 'client', 'campaign_update', 'Mamaearth Campaign - Creator Status Update', 'Hi Ankit, Aisha Sharma deliverable is approved and ready to go live. Sanjana Ghosh script is pending.', false, '2026-07-25 11:00:00+05:30'),
('44444444-4444-4444-4444-444444444444', 'social@zomato.com', 'client', 'weekly_report', 'Zomato Binge - Weekly Performance Report', 'Week 1 Report: 2 live deliverables. Total views: 865k. Total engagement: 7.5%', true, '2026-08-05 09:00:00+05:30')
ON CONFLICT DO NOTHING;

-- 13. REJECTION INTELLIGENCE
INSERT INTO cp_rejection_intelligence (creator_channel_url, campaign_id, rejection_reason, rejected_by, brand_name, campaign_type) VALUES
('https://youtube.com/@BeerBiceps', '55555555-5555-5555-5555-555555555555', 'Brand tone mismatch - too fitness focused for Cred premium lifestyle positioning', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cred', 'brand_awareness'),
('https://youtube.com/@randomcreator1', '11111111-1111-1111-1111-111111111111', 'Subscriber count too low for tech product launch pricing', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'boAt', 'product_launch'),
('https://instagram.com/@unknown_beauty', '22222222-2222-2222-2222-222222222222', 'Engagement rate below 2% threshold - suspected fake followers', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mamaearth', 'brand_awareness')
ON CONFLICT DO NOTHING;

-- 14. PRODUCT SHIPMENTS
INSERT INTO cp_product_shipments (deliverable_id, campaign_id, product_name, tracking_number, carrier, status, shipped_at, delivered_at, estimated_delivery, notes) VALUES
('1d1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d', '11111111-1111-1111-1111-111111111111', 'Boat Rockerz 550', 'TRK123456789', 'Delhivery', 'delivered', '2026-07-06 10:00:00+05:30', '2026-07-08 14:00:00+05:30', '2026-07-09', 'Delivered to Mumbai address'),
('2d2d2d2d-2d2d-2d2d-2d2d-2d2d2d2d2d2d', '11111111-1111-1111-1111-111111111111', 'Boat Rockerz 550', 'TRK987654321', 'BlueDart', 'delivered', '2026-07-09 11:00:00+05:30', '2026-07-11 09:00:00+05:30', '2026-07-12', 'Delivered to Delhi address'),
('3d3d3d3d-3d3d-3d3d-3d3d-3d3d3d3d3d3d', '11111111-1111-1111-1111-111111111111', 'Boat Rockerz 550', 'TRK456789123', 'Ekart', 'in_transit', '2026-07-16 14:00:00+05:30', NULL, '2026-07-19', 'In transit to Mumbai'),
('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', '22222222-2222-2222-2222-222222222222', 'Mamaearth Onion Hair Oil', 'TRK789123456', 'XpressBees', 'delivered', '2026-07-19 10:00:00+05:30', '2026-07-21 12:00:00+05:30', '2026-07-22', 'Delivered to Delhi'),
('6d6d6d6d-6d6d-6d6d-6d6d-6d6d6d6d6d6d', '22222222-2222-2222-2222-222222222222', 'Mamaearth Onion Hair Oil', 'TRK321654987', 'Ekart', 'delivered', '2026-07-21 09:00:00+05:30', '2026-07-23 15:00:00+05:30', '2026-07-24', 'Delivered to Delhi')
ON CONFLICT DO NOTHING;


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

