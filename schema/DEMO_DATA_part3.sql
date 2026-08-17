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
