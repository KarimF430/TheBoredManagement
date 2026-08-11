/**
 * Comment Sentiment Analysis
 * Extracts and summarizes positive, negative, neutral sentiment from comments
 * Uses OpenAI or Google Gemini for analysis
 */

export interface SentimentResult {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed'
  score: number
  positive: number
  negative: number
  neutral: number
  keyPhrases: string[]
  summary: string
  comments: Array<{
    text: string
    sentiment: 'positive' | 'negative' | 'neutral'
    confidence: number
  }>
}

export async function analyzeSentiment(
  comments: string[],
  brandName?: string
): Promise<SentimentResult> {
  if (!comments || comments.length === 0) {
    return {
      overall: 'neutral', score: 0, positive: 0, negative: 0, neutral: 0,
      keyPhrases: [], summary: 'No comments to analyze.', comments: [],
    }
  }

  const commentSample = comments.slice(0, 50).map((c, i) => `${i + 1}. ${c}`).join('\n')

  const prompt = `Analyze the sentiment of these YouTube/Instagram comments${brandName ? ` about ${brandName}` : ''}. Return JSON with:
{
  "overall": "positive" | "negative" | "neutral" | "mixed",
  "score": number (-1 to 1),
  "positive": count,
  "negative": count,
  "neutral": count,
  "keyPhrases": [top 5-10 key phrases],
  "summary": "one paragraph summary",
  "comments": [{ "text": "original comment", "sentiment": "positive"|"negative"|"neutral", "confidence": 0-1 }]
}

Comments:
${commentSample}

Return ONLY valid JSON, no markdown.`

  try {
    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      })
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as SentimentResult
      }
    }

    // Try Gemini
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
          }),
        }
      )
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as SentimentResult
      }
    }
  } catch {
    // Fallback to simple analysis
  }

  return simpleSentimentAnalysis(comments)
}

function simpleSentimentAnalysis(comments: string[]): SentimentResult {
  const positiveWords = ['great', 'love', 'amazing', 'awesome', 'best', 'good', 'nice', 'perfect', 'excellent', 'fantastic', 'beautiful', 'helpful', 'thank', 'thanks', 'super', 'brilliant', 'outstanding', 'impressive', 'cool', 'fire']
  const negativeWords = ['bad', 'worst', 'hate', 'terrible', 'awful', 'poor', 'ugly', 'horrible', 'boring', 'waste', 'fake', 'stupid', 'disappointing', 'annoying', 'spam', 'scam', 'dislike', 'disagree', 'pathetic', 'useless']

  let positive = 0
  let negative = 0
  let neutral = 0
  const analyzed: SentimentResult['comments'] = []

  for (const comment of comments) {
    const lower = comment.toLowerCase()
    const posCount = positiveWords.filter(w => lower.includes(w)).length
    const negCount = negativeWords.filter(w => lower.includes(w)).length

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    let confidence = 0.5
    if (posCount > negCount) { sentiment = 'positive'; confidence = Math.min(0.9, 0.5 + posCount * 0.1); positive++ }
    else if (negCount > posCount) { sentiment = 'negative'; confidence = Math.min(0.9, 0.5 + negCount * 0.1); negative++ }
    else { neutral++ }

    analyzed.push({ text: comment.substring(0, 200), sentiment, confidence })
  }

  const total = comments.length || 1
  const score = (positive - negative) / total
  let overall: SentimentResult['overall'] = 'neutral'
  if (score > 0.2) overall = 'positive'
  else if (score < -0.2) overall = 'negative'
  else if (positive > 0 && negative > 0) overall = 'mixed'

  return {
    overall, score: Number(score.toFixed(2)),
    positive, negative, neutral,
    keyPhrases: [],
    summary: `${positive} positive, ${negative} negative, ${neutral} neutral comments analyzed.`,
    comments: analyzed,
  }
}
