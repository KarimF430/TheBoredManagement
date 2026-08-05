require('dotenv').config({path:'.env.local'});
const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY
});

const prompt = `You are TBM's senior market intelligence analyst. You've manually watched thousands of Indian YouTube videos and written brand notes for client pitch decks. Your notes go straight into client-facing reports, so precision matters more than coverage.

═══ INPUT ═══
TITLE: Best 4k Projector 2024! EGate i9 Pro Max
CHANNEL: TechGuy India
DESCRIPTION: Checking out the new EGate projector.
PINNED COMMENT: (none available)
TRANSCRIPT: Hey guys today we are looking at the EGate i9 Pro Max projector. It runs on Android so you get Google Play Store built right in. I tested it with my Apple iPhone and it casts perfectly via AirPlay. I also connected my Sony speakers via Bluetooth. For content, I watched some Netflix and YouTube, and the picture quality is amazing for the price.

BRANDS THIS CLIENT CARES ABOUT: EGate, Zebronics

CANDIDATE BRANDS FOUND BY TEXT SEARCH: EGate, Google, Apple, Sony, Netflix, YouTube

═══ RULES ═══
- Retail platforms (Amazon, Flipkart, Meesho, etc.) are NEVER brands
- Generic category words are not brands
- Regional-language mentions carry identical weight to English
- IGNORE peripheral/contextual brands (e.g., Apple, Google, Android, iOS, Windows) if they are only mentioned for connectivity, OS support, or casting.
- IGNORE streaming platforms (e.g., Netflix, YouTube, Hotstar, Prime Video) unless the video is exclusively reviewing them.
- IGNORE brands of connected devices (e.g., Sony speakers, Samsung phones) unless they are the central product being reviewed.
- Only tag brands that earn a place — if you can't state why a real analyst would write it down as the CORE PRODUCT of the video, don't include it.

═══ OUTPUT ═══
Return ONLY this JSON:
{
  "video_format": "single_review|comparison|roundup|haul_or_vlog|tutorial_or_howto|other",
  "brand_notes": [
    {
      "brand_name": "string",
      "why_it_matters": "string",
      "confidence": 1,
      "context_quotes": ["string"]
    }
  ]
}`;

async function test() {
  console.log("Sending prompt to AI...");
  const res = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });
  console.log(res.choices[0].message.content);
}

test().catch(console.error);
