/**
 * Creator Niche Taxonomy — Real Indian Creator Ecosystem
 *
 * 6 clusters, 31 niches, real sub-niches.
 * Variable-width clusters — Knowledge & Trust has 6 because it genuinely has more.
 * Each niche carries its actual sub-niches so a creator can say "skincare" not just "beauty."
 *
 * The two-tap flow: Cluster → Niche (with optional sub-niche refine).
 * This is the source of truth for the onboarding UI.
 */

export interface NicheItem {
  id: string
  niche_name: string
  icon: string
  sub_niches: string[]
  content_types: string[]
}

export interface Cluster {
  id: string
  name: string
  emoji: string
  vibe: string
  niches: NicheItem[]
}

export const NICHE_CLUSTERS: Cluster[] = [
  // ── Visual & Aesthetic (5 niches) ─────────────────────────────
  {
    id: 'visual-aesthetic',
    name: 'Visual & Aesthetic',
    emoji: '🎨',
    vibe: 'Beauty, fashion, and visual craft',
    niches: [
      {
        id: 'fashion',
        niche_name: 'Fashion',
        icon: '👗',
        sub_niches: ['Streetwear', 'Traditional & Ethnic', 'Sustainable Fashion', 'Thrift & Upcycle', 'Luxury & Designer', 'Plus-Size & Inclusive'],
        content_types: ['reels-shorts', 'static-carousel', 'long-form'],
      },
      {
        id: 'beauty',
        niche_name: 'Beauty & Personal Care',
        icon: '💄',
        sub_niches: ['Makeup Tutorials', 'Skincare Routines', 'Haircare & Styling', 'Fragrance & Perfume', "Men's Grooming"],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'photography',
        niche_name: 'Photography',
        icon: '📸',
        sub_niches: ['Portrait & Lifestyle', 'Street Photography', 'Travel Photography', 'Product Photography', 'Editorial & Fashion'],
        content_types: ['static-carousel', 'reels-shorts', 'long-form'],
      },
      {
        id: 'art-craft',
        niche_name: 'Art & Craft',
        icon: '🎨',
        sub_niches: ['Painting & Illustration', 'Digital Art & Design', 'DIY Crafts & Maker', 'Calligraphy & Lettering', 'Resin & Mixed Media'],
        content_types: ['reels-shorts', 'static-carousel', 'long-form'],
      },
      {
        id: 'home-interior',
        niche_name: 'Home & Interior',
        icon: '🏠',
        sub_niches: ['Interior Design', 'Minimalism & Organization', 'DIY Home Decor', 'Gardening & Plants', 'Small Space Living'],
        content_types: ['reels-shorts', 'static-carousel', 'long-form'],
      },
    ],
  },

  // ── Knowledge & Trust (6 niches — genuinely more distinct) ────
  {
    id: 'knowledge-trust',
    name: 'Knowledge & Trust',
    emoji: '📚',
    vibe: 'Education, finance, and credible insight',
    niches: [
      {
        id: 'education',
        niche_name: 'Education',
        icon: '🎓',
        sub_niches: ['Academic & Board Exams', 'Competitive Exams (JEE/NEET/UPSC)', 'Skill Development & Upskilling', 'Language Learning', 'Study Abroad & Scholarships'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'finance',
        niche_name: 'Finance & Investing',
        icon: '💰',
        sub_niches: ['Stock Market & Trading', 'Mutual Funds & SIP', 'Crypto & Web3', 'Personal Finance & Budgeting', 'Tax & Accounting', 'Insurance & Planning'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'tech',
        niche_name: 'Technology',
        icon: '💻',
        sub_niches: ['Smartphones & Mobile', 'Laptops & Computing', 'AI & Machine Learning', 'Programming & Dev', 'Gadgets & Accessories', 'App Reviews'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'news-commentary',
        niche_name: 'News & Commentary',
        icon: '📰',
        sub_niches: ['Current Affairs & Analysis', 'Political Commentary', 'Social Issues & Debate', 'Fact-Checking & Verification', 'Investigative & Explainer'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'business',
        niche_name: 'Business & Entrepreneurship',
        icon: '💼',
        sub_niches: ['Startups & Fundraising', 'Marketing & Growth', 'E-commerce & D2C', 'Side Hustles & Freelancing', 'Leadership & Management'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'science',
        niche_name: 'Science & Research',
        icon: '🔬',
        sub_niches: ['Popular Science & Explainers', 'Experiments & Demos', 'Environment & Climate', 'Space & Astronomy', 'Medical & Health Science'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
    ],
  },

  // ── Entertainment & Performance (5 niches) ────────────────────
  {
    id: 'entertainment-performance',
    name: 'Entertainment & Performance',
    emoji: '🎬',
    vibe: 'Comedy, music, and storytelling',
    niches: [
      {
        id: 'comedy',
        niche_name: 'Comedy & Skits',
        icon: '😂',
        sub_niches: ['Sketch Comedy', 'Roast & Reaction', 'Relatable & Observational', 'Satire & Parody', 'Dark Comedy & Adult Humor'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'music-dance',
        niche_name: 'Music & Dance',
        icon: '🎵',
        sub_niches: ['Singing & Covers', 'Original Music & Composition', 'Dance Choreography', 'Classical & Semi-Classical', 'Fusion & Independent'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'storytelling',
        niche_name: 'Storytelling & Narratives',
        icon: '📖',
        sub_niches: ['Short Films & Scripts', 'True Crime & Mystery', 'Horror & Thriller', 'Documentary & Docu-style', 'Drama & Web Series'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'gaming',
        niche_name: 'Gaming',
        icon: '🎮',
        sub_niches: ['Mobile Gaming (BGMI/Free Fire)', 'PC & Console Gaming', 'Esports & Competitive', 'Game Reviews & Analysis', 'Streaming & Let\'s Play', 'Game Development'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'pop-culture',
        niche_name: 'Pop Culture & Reviews',
        icon: '🍿',
        sub_niches: ['Movie & Film Reviews', 'Web Series & OTT', 'Celebrity & Fan Culture', 'Trending Topics & Memes', 'Anime & Manga'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
    ],
  },

  // ── Community & Belief (5 niches) ────────────────────────────
  {
    id: 'community-belief',
    name: 'Community & Belief',
    emoji: '🙏',
    vibe: 'Spirituality, relationships, and social impact',
    niches: [
      {
        id: 'spirituality',
        niche_name: 'Spirituality & Devotion',
        icon: '🕉️',
        sub_niches: ['Vedic & Scriptural Wisdom', 'Meditation & Mindfulness', 'Yoga Philosophy & Practice', 'Temple Culture & Pilgrimage', 'Devotional Music & Bhajans'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'relationships',
        niche_name: 'Relationships & Dating',
        icon: '💑',
        sub_niches: ['Dating Advice & Tips', 'Marriage & Partnerships', 'Family Dynamics', 'Self-Love & Confidence', 'LGBTQ+ & Inclusive'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'parenting',
        niche_name: 'Parenting & Family',
        icon: '👨‍👩‍👧',
        sub_niches: ['Pregnancy & Prenatal', 'Baby & Toddler Care', 'Parenting Tips & Discipline', 'Family Vlogs & Day-in-Life', 'Kids Education & Activities'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'social-impact',
        niche_name: 'Social Impact & Activism',
        icon: '✊',
        sub_niches: ['Environment & Climate', 'Education Access & Literacy', 'Animal Welfare & Rights', 'Community Service & Volunteering', 'Disability & Accessibility'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'pets',
        niche_name: 'Pets & Animals',
        icon: '🐾',
        sub_niches: ['Dog Content & Breeds', 'Cat Content & Care', 'Pet Care & Training Tips', 'Animal Rescue & Adoption', 'Exotic Pets & Wildlife'],
        content_types: ['reels-shorts', 'static-carousel', 'long-form'],
      },
    ],
  },

  // ── Physical & Performance (5 niches) ─────────────────────────
  {
    id: 'physical-performance',
    name: 'Physical & Performance',
    emoji: '💪',
    vibe: 'Fitness, sports, and active living',
    niches: [
      {
        id: 'fitness',
        niche_name: 'Fitness & Gym',
        icon: '🏋️',
        sub_niches: ['Workout Routines & Plans', 'Bodybuilding & Physique', 'Home Fitness & No-Equipment', 'Calisthenics & Street Workout', 'Transformation & Progress'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'yoga',
        niche_name: 'Yoga & Wellness',
        icon: '🧘',
        sub_niches: ['Yoga Flows & Sequences', 'Guided Meditation', 'Breathwork & Pranayama', 'Holistic Health & Healing', 'Ayurvedic Wellness'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'sports',
        niche_name: 'Sports & Cricket',
        icon: '🏏',
        sub_niches: ['Cricket Analysis & Commentary', 'Football & Multi-Sport', 'Kabaddi & Indian Sports', 'Athlete Profiles & Stories', 'Sports Science & Training'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'outdoor',
        niche_name: 'Outdoor & Adventure',
        icon: '⛰️',
        sub_niches: ['Trekking & Hiking', 'Camping & Backpacking', 'Biking & Motorcycling', 'Rock Climbing & Rappelling', 'Adventure Travel & Expeditions'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'health-nutrition',
        niche_name: 'Health & Nutrition',
        icon: '🥗',
        sub_niches: ['Diet Plans & Meal Prep', 'Supplements & Evidence-Based', 'Mental Health & Therapy', 'Ayurveda & Traditional Medicine', 'Nutrition Science & Myth-Busting'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
    ],
  },

  // ── Lifestyle & Vlogging (5 niches) ───────────────────────────
  {
    id: 'lifestyle-vlogging',
    name: 'Lifestyle & Vlogging',
    emoji: '✈️',
    vibe: 'Daily life, travel, food, and personal brand',
    niches: [
      {
        id: 'travel',
        niche_name: 'Travel',
        icon: '✈️',
        sub_niches: ['Budget & Backpacking', 'Luxury & Premium', 'Solo Travel', 'Road Trips & Drives', 'Hidden Gems & Offbeat', 'International & NRI'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'food',
        niche_name: 'Food & Cooking',
        icon: '🍳',
        sub_niches: ['Home Cooking & Recipes', 'Street Food & Markets', 'Restaurant Reviews & Guides', 'Baking & Desserts', 'Regional Indian Cuisine', 'Healthy & Functional Eating'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
      {
        id: 'daily-vlogs',
        niche_name: 'Daily Vlogs',
        icon: '📹',
        sub_niches: ['Day-in-My-Life', 'College & Student Life', 'Office & Work Life', 'City & Neighbourhood Vlogs', 'Family & Household Vlogs'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'automobiles',
        niche_name: 'Automobiles',
        icon: '🚗',
        sub_niches: ['Car Reviews & Comparisons', 'Bike Reviews & Culture', 'Electric Vehicles & EV Lifestyle', 'Car Modification & Detailing', 'Driving Tips & Road Stories'],
        content_types: ['long-form', 'reels-shorts', 'static-carousel'],
      },
      {
        id: 'lifestyle-motivation',
        niche_name: 'Lifestyle & Motivation',
        icon: '🌟',
        sub_niches: ['Productivity & Systems', 'Self-Improvement & Growth', 'Minimalism & Intentional Living', 'Morning Routines & Rituals', 'Life Philosophy & Reflections'],
        content_types: ['reels-shorts', 'long-form', 'static-carousel'],
      },
    ],
  },
]

/**
 * Indian languages for the predictive multi-select.
 * Pre-selected based on creator's state/city.
 */
export const INDIAN_LANGUAGES = [
  { code: 'hi', label: 'Hindi', states: ['Delhi', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Bihar', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Haryana'] },
  { code: 'en', label: 'English', states: [] },
  { code: 'bn', label: 'Bengali', states: ['West Bengal'] },
  { code: 'te', label: 'Telugu', states: ['Telangana', 'Andhra Pradesh'] },
  { code: 'mr', label: 'Marathi', states: ['Maharashtra'] },
  { code: 'ta', label: 'Tamil', states: ['Tamil Nadu'] },
  { code: 'gu', label: 'Gujarati', states: ['Gujarat'] },
  { code: 'kn', label: 'Kannada', states: ['Karnataka'] },
  { code: 'ml', label: 'Malayalam', states: ['Kerala'] },
  { code: 'pa', label: 'Punjabi', states: ['Punjab'] },
  { code: 'or', label: 'Odia', states: ['Odisha'] },
  { code: 'as', label: 'Assamese', states: ['Assam'] },
  { code: 'ur', label: 'Urdu', states: [] },
  { code: 'ne', label: 'Nepali', states: ['Sikkim'] },
  { code: 'ks', label: 'Kashmiri', states: [] },
  { code: 'sd', label: 'Sindhi', states: [] },
  { code: 'mai', label: 'Maithili', states: ['Bihar'] },
  { code: 'sat', label: 'Santali', states: ['Jharkhand'] },
  { code: 'mi', label: 'Meitei', states: ['Manipur'] },
  { code: 'kok', label: 'Konkani', states: ['Goa'] },
] as const

export type LanguageCode = typeof INDIAN_LANGUAGES[number]['code']

/**
 * Creator types — single-select.
 */
export const CREATOR_TYPES = [
  { id: 'solo', label: 'Solo', emoji: '👤', description: 'Just me' },
  { id: 'couple', label: 'Couple', emoji: '👫', description: 'Duo creators' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦', description: 'Family content' },
  { id: 'group', label: 'Group', emoji: '👥', description: '3+ people' },
  { id: 'faceless', label: 'Faceless', emoji: '🎭', description: 'No face on camera' },
] as const

/**
 * Content formats — multi-select.
 */
export const CONTENT_FORMATS = [
  { id: 'reels-shorts', label: 'Reels / Shorts', emoji: '📱' },
  { id: 'long-form', label: 'Long-form', emoji: '🎬' },
  { id: 'static-carousel', label: 'Static / Carousel', emoji: '🖼️' },
  { id: 'live-stories', label: 'Live / Stories', emoji: '📡' },
] as const

/**
 * Brand categories for the deferred "brands wanted" axis.
 */
export const BRAND_CATEGORIES = [
  'Fashion & Apparel',
  'Beauty & Personal Care',
  'Technology & Gadgets',
  'Food & Beverage',
  'Health & Wellness',
  'Finance & Banking',
  'Automobile',
  'Education & EdTech',
  'E-commerce & D2C',
  'Home & Living',
  'Travel & Hospitality',
  'Entertainment & Media',
  'Sports & Fitness',
  'Gaming',
  'Sustainability & NGO',
] as const

/**
 * Indian states for location-based language pre-selection.
 */
export const INDIAN_STATES_LIST = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Other',
] as const
