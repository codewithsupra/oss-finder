import { describe, it, expect, vi, afterEach } from 'vitest'
import { estimateDifficulty, repoNameFromUrl, timeAgo } from './difficulty'
import type { GitHubIssue } from './types'

const issue = (over: Partial<GitHubIssue> = {}): GitHubIssue => ({
  id: 1,
  number: 1,
  title: 't',
  html_url: '',
  repository_url: 'https://api.github.com/repos/owner/name',
  state: 'open',
  comments: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  body: 'A clear, short description.',
  labels: [],
  user: { login: 'u', avatar_url: '' },
  ...over,
})

afterEach(() => vi.useRealTimers())

describe('estimateDifficulty', () => {
  it('rates a short, described, beginner-labelled issue as easy', () => {
    const r = estimateDifficulty(issue({ labels: [{ id: 1, name: 'good first issue', color: '' }] }))
    expect(r.level).toBe('easy')
    expect(r.hours).toBe('1–3 hrs')
  })

  it('rates a long, contested, architectural issue as hard', () => {
    const r = estimateDifficulty(
      issue({ comments: 25, body: 'x'.repeat(3000), labels: [{ id: 1, name: 'Architecture', color: '' }] }),
    )
    expect(r.level).toBe('hard')
  })

  it('lets hard labels win over easy ones', () => {
    const r = estimateDifficulty(
      issue({ labels: [{ id: 1, name: 'good first issue', color: '' }, { id: 2, name: 'security', color: '' }] }),
    )
    expect(r.reasons).toContain('Labels suggest structural or sensitive changes')
  })

  it('penalises issues with no description and explains why', () => {
    const r = estimateDifficulty(issue({ body: null, comments: 0 }))
    expect(r.level).toBe('medium')
    expect(r.reasons).toContain('No description — expect investigation time')
  })

  it('treats issues open for 6+ months as harder', () => {
    const old = new Date(Date.now() - 200 * 86_400_000).toISOString()
    const r = estimateDifficulty(issue({ created_at: old }))
    expect(r.reasons.some((x) => x.startsWith('Open for'))).toBe(true)
  })
})

describe('repoNameFromUrl', () => {
  it('extracts owner/name from an API URL', () => {
    expect(repoNameFromUrl('https://api.github.com/repos/ueberdosis/tiptap')).toBe('ueberdosis/tiptap')
  })
  it('returns the input when the URL has no /repos/ segment', () => {
    expect(repoNameFromUrl('weird')).toBe('weird')
  })
})

describe('timeAgo', () => {
  it('formats relative times', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T12:00:00Z'))
    expect(timeAgo('2026-09-21T11:59:30Z')).toBe('just now')
    expect(timeAgo('2026-09-21T11:00:00Z')).toBe('1h ago')
    expect(timeAgo('2026-09-18T12:00:00Z')).toBe('3d ago')
    expect(timeAgo('2025-09-01T12:00:00Z')).toBe('1y ago')
  })
})
