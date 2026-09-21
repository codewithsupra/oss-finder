import type { GitHubIssue } from './types'

// Pure logic behind the Merge Reality Check. No network or React here, so it is unit-tested.

const INSIDER_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])

export function isBot(login: string): boolean {
  return /\[bot\]$/i.test(login)
}

/**
 * Was this merged PR written by an outsider (someone a first-time contributor can
 * compare themselves to)? Uses GitHub's author_association, because comparing the
 * author's login with the repo owner is wrong for organisation-owned repos:
 * nobody's login is "facebook", so every PR would look external.
 */
export function isExternalAuthor(pr: Pick<GitHubIssue, 'user' | 'author_association'>, owner: string): boolean {
  if (isBot(pr.user.login)) return false
  if (pr.author_association) return !INSIDER_ASSOCIATIONS.has(pr.author_association.toUpperCase())
  return pr.user.login.toLowerCase() !== owner.toLowerCase()
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface MergeStats {
  mergedSampleSize: number
  externalMergedCount: number
  medianDaysToMerge: number | null
}

export function summarizeMergedPrs(
  prs: Pick<GitHubIssue, 'user' | 'author_association' | 'created_at' | 'closed_at'>[],
  owner: string,
): MergeStats {
  const days = prs
    .filter((p) => p.closed_at)
    .map((p) => (new Date(p.closed_at as string).getTime() - new Date(p.created_at).getTime()) / 86_400_000)
  const med = median(days)
  return {
    mergedSampleSize: prs.length,
    externalMergedCount: prs.filter((p) => isExternalAuthor(p, owner)).length,
    medianDaysToMerge: med === null ? null : Math.round(med * 10) / 10,
  }
}

export interface PulseInput extends MergeStats {
  pushedAt: string
  archived: boolean
}

export interface Verdict {
  icon: string
  label: string
  cls: string
}

export function mergeVerdict(pulse: PulseInput, now: number = Date.now()): Verdict {
  const daysSincePush = (now - new Date(pulse.pushedAt).getTime()) / 86_400_000
  if (pulse.archived) return { icon: '⚰️', label: 'Archived — do not contribute', cls: 'text-red-400' }
  if (pulse.mergedSampleSize === 0)
    return { icon: '🚩', label: 'No recently merged PRs — your PR may rot', cls: 'text-red-400' }
  if (daysSincePush > 90) return { icon: '💀', label: 'Maintainers gone quiet (90+ days)', cls: 'text-red-400' }
  const externalRatio = pulse.externalMergedCount / pulse.mergedSampleSize
  if (daysSincePush <= 30 && externalRatio >= 0.4)
    return { icon: '✅', label: 'Healthy — outsiders get merged here', cls: 'text-emerald-400' }
  if (externalRatio < 0.2)
    return { icon: '⚠️', label: 'Mostly insider merges — expect slow review', cls: 'text-amber-400' }
  return { icon: '🙂', label: 'Reasonably active', cls: 'text-amber-300' }
}
