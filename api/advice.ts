import type { VercelRequest, VercelResponse } from '@vercel/node'

// Free-tier model on OpenRouter; override with OPENROUTER_MODEL if it's ever
// deprecated (free model IDs rotate — check openrouter.ai/models?q=free)
const MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free'

const SYSTEM_PROMPT =
  'You are an experienced open-source maintainer coaching a first-time contributor. ' +
  'Given a GitHub issue, give concrete, specific advice for getting a PR merged: how to claim the issue, ' +
  'what to investigate first, scope traps to avoid, and what maintainers of this kind of repo look for in a PR. ' +
  'Be direct and practical. Max 6 short bullet points, plain text with "- " bullets, no headers, no preamble.'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    // Client falls back to the static checklist when advice isn't configured
    return res.status(501).json({ error: 'AI advice not configured' })
  }

  const { title, repo, body, labels, comments } = req.body ?? {}
  if (typeof title !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'title and repo are required' })
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
        max_tokens: 512,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              `Repo: ${repo}\nIssue: ${title}\n` +
              `Labels: ${Array.isArray(labels) ? labels.join(', ') : 'none'}\n` +
              `Comments so far: ${typeof comments === 'number' ? comments : 'unknown'}\n\n` +
              `Issue description:\n${typeof body === 'string' ? body.slice(0, 4000) : '(no description)'}`,
          },
        ],
      }),
    })

    if (upstream.status === 429) {
      return res.status(429).json({ error: 'Rate limited — try again in a minute' })
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Failed to generate advice' })
    }
    const data = await upstream.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    if (!text) {
      return res.status(502).json({ error: 'Empty response from model' })
    }
    return res.status(200).json({ advice: text })
  } catch {
    return res.status(502).json({ error: 'Failed to generate advice' })
  }
}
