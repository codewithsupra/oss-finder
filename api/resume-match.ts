import type { VercelRequest, VercelResponse } from '@vercel/node'

const MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free'

// Canonical GitHub search language names — keeps recommendations queryable
const KNOWN_LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'C', 'C#',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'Shell', 'HTML', 'CSS', 'Dart',
]
const LANGUAGE_BY_LOWERCASE = new Map(KNOWN_LANGUAGES.map((l) => [l.toLowerCase(), l]))

const SYSTEM_PROMPT =
  'You are a technical recruiter matching engineers to open-source projects. ' +
  'Given resume text, identify the 3 programming languages this person is most experienced in, ' +
  `chosen ONLY from this exact list: ${KNOWN_LANGUAGES.join(', ')}. ` +
  'Order them by evident depth of experience, strongest first. ' +
  'Respond with ONLY valid JSON, no markdown, no commentary, in this exact shape: ' +
  '{"languages": ["Lang1", "Lang2", "Lang3"], "summary": "one sentence on their profile"}'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(501).json({ error: 'Resume matching not configured' })
  }

  const { resumeText } = req.body ?? {}
  if (typeof resumeText !== 'string' || resumeText.trim().length < 50) {
    return res.status(400).json({ error: 'resumeText is required (min 50 characters)' })
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://oss-finder-phi.vercel.app',
        'X-Title': 'OSS Finder',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: resumeText.slice(0, 8000) },
        ],
      }),
    })

    if (upstream.status === 429) {
      return res.status(429).json({ error: 'Rate limited — try again in a minute' })
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Failed to analyze resume' })
    }
    const data = await upstream.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse analysis' })

    const parsed = JSON.parse(jsonMatch[0])
    const languages: string[] = Array.isArray(parsed.languages)
      ? parsed.languages
          .map((l: unknown) => (typeof l === 'string' ? LANGUAGE_BY_LOWERCASE.get(l.trim().toLowerCase()) : undefined))
          .filter((l: string | undefined): l is string => Boolean(l))
          .slice(0, 3)
      : []
    if (languages.length === 0) {
      return res.status(502).json({ error: 'No recognizable languages found in resume' })
    }
    return res.status(200).json({
      languages,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    })
  } catch {
    return res.status(502).json({ error: 'Failed to analyze resume' })
  }
}
