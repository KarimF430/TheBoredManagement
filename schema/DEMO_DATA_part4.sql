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
