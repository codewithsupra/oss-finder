import { describe, it, expect } from 'vitest'
import { isBot, isExternalAuthor, median, summarizeMergedPrs, mergeVerdict } from './pulse'

const pr = (login: string, association?: string, createdAt = '2026-01-01T00:00:00Z', closedAt: string | null = '2026-01-03T00:00:00Z') => ({
  user: { login, avatar_url: '' },
  author_association: association,
  created_at: createdAt,
  closed_at: closedAt,
})

describe('isExternalAuthor', () => {
  it('uses author_association, so org-owned repos are judged correctly', () => {
    // Regression: comparing login to owner counted every PR in "facebook/react" as external.
    expect(isExternalAuthor(pr('gaearon', 'MEMBER'), 'facebook')).toBe(false)
    expect(isExternalAuthor(pr('maintainer', 'COLLABORATOR'), 'facebook')).toBe(false)
    expect(isExternalAuthor(pr('newcomer', 'FIRST_TIME_CONTRIBUTOR'), 'facebook')).toBe(true)
    expect(isExternalAuthor(pr('regular', 'CONTRIBUTOR'), 'facebook')).toBe(true)
  })

  it('never counts bots as outsiders', () => {
    expect(isBot('dependabot[bot]')).toBe(true)
    expect(isExternalAuthor(pr('dependabot[bot]', 'NONE'), 'facebook')).toBe(false)
  })

  it('falls back to comparing with the owner when association is missing', () => {
    expect(isExternalAuthor(pr('Alice'), 'alice')).toBe(false)
    expect(isExternalAuthor(pr('bob'), 'alice')).toBe(true)
  })
})

describe('median', () => {
  it('handles empty, odd and even lengths', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5) // regression: previously returned 3
  })
  it('does not mutate its input', () => {
    const xs = [3, 1, 2]
    median(xs)
    expect(xs).toEqual([3, 1, 2])
  })
})

describe('summarizeMergedPrs', () => {
  it('counts outsiders and computes median days to merge', () => {
    const stats = summarizeMergedPrs(
      [
        pr('member', 'MEMBER', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'), // 1 day
        pr('newbie', 'NONE', '2026-01-01T00:00:00Z', '2026-01-04T00:00:00Z'), // 3 days
        pr('dependabot[bot]', 'NONE', '2026-01-01T00:00:00Z', '2026-01-06T00:00:00Z'), // 5 days
        pr('contrib', 'CONTRIBUTOR', '2026-01-01T00:00:00Z', '2026-01-08T00:00:00Z'), // 7 days
      ],
      'someorg',
    )
    expect(stats).toEqual({ mergedSampleSize: 4, externalMergedCount: 2, medianDaysToMerge: 4 })
  })

  it('ignores PRs without a close date when computing the median', () => {
    const stats = summarizeMergedPrs([pr('a', 'NONE', '2026-01-01T00:00:00Z', null)], 'o')
    expect(stats.medianDaysToMerge).toBeNull()
    expect(stats.mergedSampleSize).toBe(1)
  })
})

describe('mergeVerdict', () => {
  const now = new Date('2026-09-01T00:00:00Z').getTime()
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()
  const base = { archived: false, mergedSampleSize: 10, externalMergedCount: 5, medianDaysToMerge: 2, pushedAt: daysAgo(3) }

  it('flags archived repos first', () => {
    expect(mergeVerdict({ ...base, archived: true }, now).label).toMatch(/Archived/)
  })
  it('flags repos with no recent merges', () => {
    expect(mergeVerdict({ ...base, mergedSampleSize: 0, externalMergedCount: 0 }, now).label).toMatch(/No recently merged/)
  })
  it('flags repos with no push in 90+ days', () => {
    expect(mergeVerdict({ ...base, pushedAt: daysAgo(120) }, now).label).toMatch(/gone quiet/)
  })
  it('calls a recently active repo with >=40% outsider merges healthy', () => {
    expect(mergeVerdict(base, now).icon).toBe('✅')
  })
  it('warns when fewer than 20% of merges come from outsiders', () => {
    expect(mergeVerdict({ ...base, externalMergedCount: 1 }, now).icon).toBe('⚠️')
  })
  it('falls back to "reasonably active" in between', () => {
    expect(mergeVerdict({ ...base, externalMergedCount: 3, pushedAt: daysAgo(45) }, now).icon).toBe('🙂')
  })
})
