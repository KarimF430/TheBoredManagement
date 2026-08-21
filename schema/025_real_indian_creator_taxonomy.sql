-- ============================================================================
-- REAL INDIAN CREATOR TAXONOMY — Variable-Width Clusters
-- 6 clusters, 31 niches, real sub-niches
-- Run AFTER 021 + 023 + 024
-- ============================================================================

-- Clear旧的 taxonomy data (safe — onboarding reads from TS constant, not DB)
DELETE FROM creator_niche_taxonomy;

-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 1: Visual & Aesthetic (5 niches)
-- ════════════════════════════════════════════════════════════════════

INSERT INTO creator_niche_taxonomy (niche_name, parent_niche, category, sub_niches, content_types, icon, display_order) VALUES
('Fashion', 'visual-aesthetic', 'Fashion & Beauty',
  ARRAY['Streetwear', 'Traditional & Ethnic', 'Sustainable Fashion', 'Thrift & Upcycle', 'Luxury & Designer', 'Plus-Size & Inclusive'],
  ARRAY['reels-shorts', 'static-carousel', 'long-form'],
  '👗', 1),

('Beauty & Personal Care', 'visual-aesthetic', 'Fashion & Beauty',
  ARRAY['Makeup Tutorials', 'Skincare Routines', 'Haircare & Styling', 'Fragrance & Perfume', 'Men''s Grooming'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '💄', 2),

('Photography', 'visual-aesthetic', 'Creative',
  ARRAY['Portrait & Lifestyle', 'Street Photography', 'Travel Photography', 'Product Photography', 'Editorial & Fashion'],
  ARRAY['static-carousel', 'reels-shorts', 'long-form'],
  '📸', 3),

('Art & Craft', 'visual-aesthetic', 'Creative',
  ARRAY['Painting & Illustration', 'Digital Art & Design', 'DIY Crafts & Maker', 'Calligraphy & Lettering', 'Resin & Mixed Media'],
  ARRAY['reels-shorts', 'static-carousel', 'long-form'],
  '🎨', 4),

('Home & Interior', 'visual-aesthetic', 'Lifestyle',
  ARRAY['Interior Design', 'Minimalism & Organization', 'DIY Home Decor', 'Gardening & Plants', 'Small Space Living'],
  ARRAY['reels-shorts', 'static-carousel', 'long-form'],
  '🏠', 5);

-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 2: Knowledge & Trust (6 niches — genuinely more distinct)
-- ════════════════════════════════════════════════════════════════════

INSERT INTO creator_niche_taxonomy (niche_name, parent_niche, category, sub_niches, content_types, icon, display_order) VALUES
('Education', 'knowledge-trust', 'Education & Business',
  ARRAY['Academic & Board Exams', 'Competitive Exams (JEE/NEET/UPSC)', 'Skill Development & Upskilling', 'Language Learning', 'Study Abroad & Scholarships'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '🎓', 6),

('Finance & Investing', 'knowledge-trust', 'Education & Business',
  ARRAY['Stock Market & Trading', 'Mutual Funds & SIP', 'Crypto & Web3', 'Personal Finance & Budgeting', 'Tax & Accounting', 'Insurance & Planning'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '💰', 7),

('Technology', 'knowledge-trust', 'Technology & Digital',
  ARRAY['Smartphones & Mobile', 'Laptops & Computing', 'AI & Machine Learning', 'Programming & Dev', 'Gadgets & Accessories', 'App Reviews'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '💻', 8),

('News & Commentary', 'knowledge-trust', 'News & Politics',
  ARRAY['Current Affairs & Analysis', 'Political Commentary', 'Social Issues & Debate', 'Fact-Checking & Verification', 'Investigative & Explainer'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '📰', 9),

('Business & Entrepreneurship', 'knowledge-trust', 'Education & Business',
  ARRAY['Startups & Fundraising', 'Marketing & Growth', 'E-commerce & D2C', 'Side Hustles & Freelancing', 'Leadership & Management'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '💼', 10),

('Science & Research', 'knowledge-trust', 'Technology & Digital',
  ARRAY['Popular Science & Explainers', 'Experiments & Demos', 'Environment & Climate', 'Space & Astronomy', 'Medical & Health Science'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '🔬', 11);

-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 3: Entertainment & Performance (5 niches)
-- ════════════════════════════════════════════════════════════════════

INSERT INTO creator_niche_taxonomy (niche_name, parent_niche, category, sub_niches, content_types, icon, display_order) VALUES
('Comedy & Skits', 'entertainment-performance', 'Entertainment',
  ARRAY['Sketch Comedy', 'Roast & Reaction', 'Relatable & Observational', 'Satire & Parody', 'Dark Comedy & Adult Humor'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '😂', 12),

('Music & Dance', 'entertainment-performance', 'Entertainment',
  ARRAY['Singing & Covers', 'Original Music & Composition', 'Dance Choreography', 'Classical & Semi-Classical', 'Fusion & Independent'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '🎵', 13),

('Storytelling & Narratives', 'entertainment-performance', 'Entertainment',
  ARRAY['Short Films & Scripts', 'True Crime & Mystery', 'Horror & Thriller', 'Documentary & Docu-style', 'Drama & Web Series'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '📖', 14),

('Gaming', 'entertainment-performance', 'Technology & Digital',
  ARRAY['Mobile Gaming (BGMI/Free Fire)', 'PC & Console Gaming', 'Esports & Competitive', 'Game Reviews & Analysis', 'Streaming & Let''s Play', 'Game Development'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '🎮', 15),

('Pop Culture & Reviews', 'entertainment-performance', 'Entertainment',
  ARRAY['Movie & Film Reviews', 'Web Series & OTT', 'Celebrity & Fan Culture', 'Trending Topics & Memes', 'Anime & Manga'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '🍿', 16);

-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 4: Community & Belief (5 niches)
-- ════════════════════════════════════════════════════════════════════

INSERT INTO creator_niche_taxonomy (niche_name, parent_niche, category, sub_niches, content_types, icon, display_order) VALUES
('Spirituality & Devotion', 'community-belief', 'Lifestyle',
  ARRAY['Vedic & Scriptural Wisdom', 'Meditation & Mindfulness', 'Yoga Philosophy & Practice', 'Temple Culture & Pilgrimage', 'Devotional Music & Bhajans'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '🕉️', 17),

('Relationships & Dating', 'community-belief', 'Lifestyle',
  ARRAY['Dating Advice & Tips', 'Marriage & Partnerships', 'Family Dynamics', 'Self-Love & Confidence', 'LGBTQ+ & Inclusive'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '💑', 18),

('Parenting & Family', 'community-belief', 'Lifestyle',
  ARRAY['Pregnancy & Prenatal', 'Baby & Toddler Care', 'Parenting Tips & Discipline', 'Family Vlogs & Day-in-Life', 'Kids Education & Activities'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '👨‍👩‍👧', 19),

('Social Impact & Activism', 'community-belief', 'Sustainability & NGO',
  ARRAY['Environment & Climate', 'Education Access & Literacy', 'Animal Welfare & Rights', 'Community Service & Volunteering', 'Disability & Accessibility'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '✊', 20),

('Pets & Animals', 'community-belief', 'Lifestyle',
  ARRAY['Dog Content & Breeds', 'Cat Content & Care', 'Pet Care & Training Tips', 'Animal Rescue & Adoption', 'Exotic Pets & Wildlife'],
  ARRAY['reels-shorts', 'static-carousel', 'long-form'],
  '🐾', 21);

-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 5: Physical & Performance (5 niches)
-- ════════════════════════════════════════════════════════════════════

INSERT INTO creator_niche_taxonomy (niche_name, parent_niche, category, sub_niches, content_types, icon, display_order) VALUES
('Fitness & Gym', 'physical-performance', 'Sports & Fitness',
  ARRAY['Workout Routines & Plans', 'Bodybuilding & Physique', 'Home Fitness & No-Equipment', 'Calisthenics & Street Workout', 'Transformation & Progress'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '🏋️', 22),

('Yoga & Wellness', 'physical-performance', 'Sports & Fitness',
  ARRAY['Yoga Flows & Sequences', 'Guided Meditation', 'Breathwork & Pranayama', 'Holistic Health & Healing', 'Ayurvedic Wellness'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '🧘', 23),

('Sports & Cricket', 'physical-performance', 'Sports & Fitness',
  ARRAY['Cricket Analysis & Commentary', 'Football & Multi-Sport', 'Kabaddi & Indian Sports', 'Athlete Profiles & Stories', 'Sports Science & Training'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '🏏', 24),

('Outdoor & Adventure', 'physical-performance', 'Sports & Fitness',
  ARRAY['Trekking & Hiking', 'Camping & Backpacking', 'Biking & Motorcycling', 'Rock Climbing & Rappelling', 'Adventure Travel & Expeditions'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '⛰️', 25),

('Health & Nutrition', 'physical-performance', 'Health & Wellness',
  ARRAY['Diet Plans & Meal Prep', 'Supplements & Evidence-Based', 'Mental Health & Therapy', 'Ayurveda & Traditional Medicine', 'Nutrition Science & Myth-Busting'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '🥗', 26);

-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 6: Lifestyle & Vlogging (5 niches)
-- ════════════════════════════════════════════════════════════════════

INSERT INTO creator_niche_taxonomy (niche_name, parent_niche, category, sub_niches, content_types, icon, display_order) VALUES
('Travel', 'lifestyle-vlogging', 'Travel & Hospitality',
  ARRAY['Budget & Backpacking', 'Luxury & Premium', 'Solo Travel', 'Road Trips & Drives', 'Hidden Gems & Offbeat', 'International & NRI'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '✈️', 27),

('Food & Cooking', 'lifestyle-vlogging', 'Food & Beverage',
  ARRAY['Home Cooking & Recipes', 'Street Food & Markets', 'Restaurant Reviews & Guides', 'Baking & Desserts', 'Regional Indian Cuisine', 'Healthy & Functional Eating'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '🍳', 28),

('Daily Vlogs', 'lifestyle-vlogging', 'Entertainment',
  ARRAY['Day-in-My-Life', 'College & Student Life', 'Office & Work Life', 'City & Neighbourhood Vlogs', 'Family & Household Vlogs'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '📹', 29),

('Automobiles', 'lifestyle-vlogging', 'Automobile',
  ARRAY['Car Reviews & Comparisons', 'Bike Reviews & Culture', 'Electric Vehicles & EV Lifestyle', 'Car Modification & Detailing', 'Driving Tips & Road Stories'],
  ARRAY['long-form', 'reels-shorts', 'static-carousel'],
  '🚗', 30),

('Lifestyle & Motivation', 'lifestyle-vlogging', 'Lifestyle',
  ARRAY['Productivity & Systems', 'Self-Improvement & Growth', 'Minimalism & Intentional Living', 'Morning Routines & Rituals', 'Life Philosophy & Reflections'],
  ARRAY['reels-shorts', 'long-form', 'static-carousel'],
  '🌟', 31);

-- ── Verify ──────────────────────────────────────────────────────
-- Should show 31 niches across 6 clusters
SELECT parent_niche as cluster, COUNT(*) as niche_count
FROM creator_niche_taxonomy
WHERE active = true
GROUP BY parent_niche
ORDER BY MIN(display_order);
