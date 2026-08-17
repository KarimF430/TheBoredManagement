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
