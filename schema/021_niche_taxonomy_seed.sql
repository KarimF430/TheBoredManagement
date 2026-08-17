-- ============================================================================
-- NICHE TAXONOMY SEED DATA
-- Comprehensive Indian creator niches
-- ============================================================================

INSERT INTO creator_niche_taxonomy (niche_name, sub_niches, content_types, icon, display_order) VALUES
-- Tech & Digital
('Technology', ARRAY['Smartphones', 'Laptops', 'Gadgets', 'AI/ML', 'Web Development', 'App Reviews', 'Tech News', 'Software Tutorials', 'Gadget Unboxing'], ARRAY['Review', 'Tutorial', 'Unboxing', 'Comparison', 'Explainer', 'News'], 'laptop', 1),
('Gaming', ARRAY['Mobile Gaming', 'PC Gaming', 'Console Gaming', 'Esports', 'Game Reviews', 'Live Streaming', 'Game Tips', 'BGMI', 'Free Fire', 'Valorant'], ARRAY['Let''s Play', 'Review', 'Stream', 'Tutorial', 'Highlights', 'Montage'], 'gamepad-2', 2),

-- Lifestyle & Personal
('Fashion', ARRAY['Mens Fashion', 'Womens Fashion', 'Streetwear', 'Ethnic Wear', 'Budget Fashion', 'Luxury Fashion', 'Saree Styling', 'Kurti Designs', 'Accessories'], ARRAY['OOTD', 'Haul', 'Lookbook', 'Review', 'Styling Tips', 'Try-On'], 'shirt', 3),
('Beauty', ARRAY['Skincare', 'Makeup', 'Haircare', 'Ayurvedic Beauty', 'Budget Beauty', 'Luxury Beauty', 'Mehendi', 'Bridal Makeup', 'Korean Skincare'], ARRAY['Tutorial', 'Review', 'Routine', 'Transformation', 'GRWM', 'Haul'], 'sparkles', 4),
('Fitness', ARRAY['Gym Workout', 'Yoga', 'Home Workout', 'Nutrition', 'Weight Loss', 'Bodybuilding', 'Martial Arts', 'Zumba', 'Pilates', 'Calisthenics'], ARRAY['Workout', 'Tips', 'Transformation', 'Routine', 'Challenge', 'Day in Life'], 'dumbbell', 5),
('Travel', ARRAY['Budget Travel', 'Luxury Travel', 'Solo Travel', 'Family Travel', 'Pilgrimage', 'Adventure', 'International', 'Weekend Getaways', 'Homestays', 'Road Trips'], ARRAY['Vlog', 'Guide', 'Review', 'Tips', 'Itinerary', 'Budget Breakdown'], 'map-pin', 6),
('Food & Cooking', ARRAY['Indian Cuisine', 'Baking', 'Street Food', 'Healthy Eating', 'Budget Meals', 'Restaurant Reviews', 'Recipe', 'Regional Food', 'Vegan', 'Desserts'], ARRAY['Recipe', 'Review', 'Vlog', 'Tutorial', 'Taste Test', 'Challenge'], 'chef-hat', 7),
('Lifestyle', ARRAY['Daily Vlogs', 'Minimalism', 'Organization', 'Productivity', 'College Life', 'Office Life', 'Couple Goals', 'Room Decor', 'Self Care'], ARRAY['Vlog', 'Tips', 'Routine', 'Day in Life', 'Challenge'], 'home', 8),

-- Entertainment & Creative
('Comedy', ARRAY['Sketch Comedy', 'Roast', 'Memes', 'Parody', 'Stand-up', 'Improv', 'Pranks', 'Relatable Humor', 'Mimicry'], ARRAY['Short', 'Sketch', 'Roast', 'Meme', 'Stand-up', 'Prank'], 'laugh', 9),
('Music', ARRAY['Singing', 'Instrumental', 'Music Production', 'Cover Songs', 'Original Music', 'Classical', 'Folk', 'Indie', 'Bollywood Covers'], ARRAY['Cover', 'Original', 'Tutorial', 'Live', 'Behind Scenes'], 'music', 10),
('Dance', ARRAY['Bollywood Dance', 'Hip Hop', 'Classical', 'Contemporary', 'Street Dance', 'Fusion', 'Kathak', 'Bharatanatyam', 'Garba'], ARRAY['Cover', 'Tutorial', 'Performance', 'Challenge', 'Behind Scenes'], 'music-2', 11),
('Art & Craft', ARRAY['Drawing', 'Painting', 'Digital Art', 'DIY Crafts', 'Pottery', 'Calligraphy', 'Rangoli', 'Mehendi Art', 'Sculpture'], ARRAY['Tutorial', 'Timelapse', 'Process', 'Challenge', 'Transformation'], 'palette', 12),
('Photography', ARRAY['Portrait', 'Landscape', 'Street Photography', 'Mobile Photography', 'Editing', 'Drone Photography', 'Product Photography'], ARRAY['Tutorial', 'Tips', 'Showcase', 'Before/After', 'Behind Scenes'], 'camera', 13),
('Film & Cinematography', ARRAY['Short Films', 'Documentary', 'Vlogging', 'Cinematography', 'Editing', 'Screenwriting', 'Acting'], ARRAY['Short Film', 'Behind Scenes', 'Tutorial', 'Tips', 'Breakdown'], 'film', 14),

-- Education & Knowledge
('Education', ARRAY['School', 'College', 'Competitive Exams', 'Board Exams', 'Study Tips', 'Language Learning', 'IIT/JEE', 'NEET', 'UPSC', 'CBSE'], ARRAY['Tutorial', 'Tips', 'Explanation', 'Notes', 'Strategy', 'Motivation'], 'graduation-cap', 15),
('Business & Entrepreneurship', ARRAY['Startups', 'Small Business', 'Marketing', 'Finance', 'Real Estate', 'Side Hustles', 'Freelancing', 'Dropshipping'], ARRAY['Tips', 'Guide', 'Interview', 'Case Study', 'Day in Life'], 'briefcase', 16),
('Finance & Investment', ARRAY['Stock Market', 'Mutual Funds', 'Crypto', 'Personal Finance', 'Tax Planning', 'SIP', 'IPO', 'Gold Investment'], ARRAY['Tips', 'Analysis', 'Tutorial', 'News', 'Beginner Guide'], 'indian-rupee', 17),
('Health & Wellness', ARRAY['Mental Health', 'Ayurveda', 'Homeopathy', 'Medical', 'Sexual Health', 'Parenting', 'Yoga', 'Meditation', 'Physiotherapy'], ARRAY['Tips', 'Guide', 'Discussion', 'Myth Busting', 'Q&A'], 'heart-pulse', 18),
('News & Politics', ARRAY['Current Affairs', 'Political Commentary', 'Social Issues', 'Local News', 'International News', 'Fact Check'], ARRAY['Analysis', 'Discussion', 'Report', 'Explainer', 'Opinion'], 'newspaper', 19),

-- Indian Specific
('Vlogs', ARRAY['Daily Vlogs', 'Travel Vlogs', 'College Vlogs', 'Family Vlogs', 'Couple Vlogs', 'Village Life', 'City Life'], ARRAY['Vlog', 'Day in Life', 'Challenge', 'Reaction'], 'video', 20),
('Relationships', ARRAY['Dating', 'Marriage', 'Family', 'Friendship', 'Breakup', 'Long Distance', 'Love Advice', 'Marriage Tips'], ARRAY['Tips', 'Story', 'Discussion', 'Q&A', 'Reaction'], 'heart', 21),
('Parenting', ARRAY['Pregnancy', 'Baby Care', 'Kids Activities', 'Education', 'Teen Parenting', 'Toddler Tips', 'Mom Life', 'Dad Life'], ARRAY['Tips', 'Routine', 'Guide', 'Day in Life', 'Haul'], 'baby', 22),
('Spirituality', ARRAY['Hinduism', 'Islam', 'Sikhism', 'Christianity', 'Meditation', 'Astrology', 'Vastu', 'Mantras', 'Bhajans'], ARRAY['Guide', 'Discussion', 'Vlog', 'Explanation', 'Chanting'], 'sparkle', 23),
('Automobiles', ARRAY['Cars', 'Bikes', 'Electric Vehicles', 'Car Reviews', 'Bike Reviews', 'Modifications', 'Car Care', 'Driving Tips'], ARRAY['Review', 'Comparison', 'Vlog', 'Walkaround', 'Test Drive'], 'car', 24),
('Pets & Animals', ARRAY['Dogs', 'Cats', 'Birds', 'Pet Care', 'Animal Rescue', 'Aquarium', 'Horse Riding'], ARRAY['Tips', 'Vlog', 'Cute Moments', 'Tutorial', 'Day in Life'], 'paw-print', 25),

-- Regional Content
('Hindi Content', ARRAY['Hindi Comedy', 'Hindi Education', 'Hindi Tech', 'Hindi News', 'Hindi Stories'], ARRAY['All Types'], 'languages', 26),
('Tamil Content', ARRAY['Tamil Comedy', 'Tamil Education', 'Tamil Tech', 'Tamil News', 'Tamil Stories'], ARRAY['All Types'], 'languages', 27),
('Telugu Content', ARRAY['Telugu Comedy', 'Telugu Education', 'Telugu Tech', 'Telugu News', 'Telugu Stories'], ARRAY['All Types'], 'languages', 28),
('Bengali Content', ARRAY['Bengali Comedy', 'Bengali Education', 'Bengali Tech', 'Bengali News', 'Bengali Stories'], ARRAY['All Types'], 'languages', 29),
('Marathi Content', ARRAY['Marathi Comedy', 'Marathi Education', 'Marathi Tech', 'Marathi News', 'Marathi Stories'], ARRAY['All Types'], 'languages', 30),
('Kannada Content', ARRAY['Kannada Comedy', 'Kannada Education', 'Kannada Tech', 'Kannada News', 'Kannada Stories'], ARRAY['All Types'], 'languages', 31),
('Malayalam Content', ARRAY['Malayalam Comedy', 'Malayalam Education', 'Malayalam Tech', 'Malayalam News', 'Malayalam Stories'], ARRAY['All Types'], 'languages', 32),
('Punjabi Content', ARRAY['Punjabi Comedy', 'Punjabi Education', 'Punjabi Tech', 'Punjabi News', 'Punjabi Stories'], ARRAY['All Types'], 'languages', 33),

-- Additional Niches
('Real Estate', ARRAY['Property Reviews', 'Investment Tips', 'Home Tours', 'Interior Design', 'Construction'], ARRAY['Review', 'Guide', 'Tour', 'Tips', 'Vlog'], 'building', 34),
('Agriculture', ARRAY['Farming Tips', 'Organic Farming', 'Dairy Farming', 'Crop Management', 'Agricultural Tech'], ARRAY['Tutorial', 'Tips', 'Vlog', 'Guide', 'Day in Life'], 'wheat', 35),
('Education Tech', ARRAY['Online Courses', 'EdTech Reviews', 'Study Apps', 'E-learning', 'Skill Development'], ARRAY['Review', 'Tutorial', 'Guide', 'Tips', 'Comparison'], 'monitor', 36),
('Home & Garden', ARRAY['Home Decor', 'Gardening', 'DIY', 'Interior Design', 'Plant Care', 'Home Improvement'], ARRAY['Tutorial', 'Tour', 'Tips', 'Transformation', 'Haul'], 'flower', 37),
('Sports', ARRAY['Cricket', 'Football', 'Badminton', 'Kabaddi', 'Chess', 'Athletics', 'Fitness Sports'], ARRAY['Tutorial', 'Analysis', 'Highlights', 'Tips', 'Vlog'], 'trophy', 38),
('Science & Technology', ARRAY['Space', 'Physics', 'Chemistry', 'Biology', 'Inventions', 'Experiments'], ARRAY['Explainer', 'Experiment', 'Tutorial', 'Discussion', 'News'], 'atom', 39),
('Motivational', ARRAY['Self Improvement', 'Success Stories', 'Life Lessons', 'Mindset', 'Goal Setting'], ARRAY['Motivation', 'Story', 'Tips', 'Discussion', 'Q&A'], 'flame', 40)
ON CONFLICT (niche_name) DO NOTHING;
