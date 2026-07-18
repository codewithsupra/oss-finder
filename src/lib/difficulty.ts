import type { DifficultyEstimate, GitHubIssue } from './types'

const EASY_LABELS = ['good first issue', 'easy', 'beginner', 'documentation', 'docs', 'typo', 'starter']
const HARD_LABELS = ['breaking change', 'architecture', 'performance', 'security', 'refactor', 'epic', 'discussion']

/**
 * Heuristic difficulty estimator. Signals:
 * - comment count: long threads mean ambiguity or contention
 * - label complexity: docs/typo skew easy, architecture/security skew hard
 * - body length: no description = you'll spend time just understanding it;
 *   very long bodies usually mean a deep problem
 * - age: issues open for months that nobody picked up are rarely trivial
 */
export function estimateDifficulty(issue: GitHubIssue): DifficultyEstimate {
  let score = 0
  const reasons: string[] = []

  if (issue.comments === 0) {
    score += 1
    reasons.push('No discussion yet — you may need to clarify scope with maintainers')
  } else if (issue.comments <= 3) {
    reasons.push('Short, focused discussion')
  } else if (issue.comments <= 10) {
    score += 1
    reasons.push(`${issue.comments} comments — some back-and-forth to read through`)
  } else {
    score += 2
    reasons.push(`${issue.comments} comments — long thread, likely contested or complex`)
  }

  const labelNames = issue.labels.map((l) => l.name.toLowerCase())
  if (labelNames.some((n) => HARD_LABELS.some((h) => n.includes(h)))) {
    score += 2
    reasons.push('Labels suggest structural or sensitive changes')
  } else if (labelNames.some((n) => EASY_LABELS.some((e) => n.includes(e)))) {
    score -= 1
    reasons.push('Labeled as beginner-friendly')
  }

  const bodyLength = issue.body?.length ?? 0
  if (bodyLength === 0) {
    score += 1
    reasons.push('No description — expect investigation time')
  } else if (bodyLength > 2000) {
    score += 1
    reasons.push('Long description — detailed but deep problem')
  } else {
    reasons.push('Reasonably described')
  }

  const ageDays = (Date.now() - new Date(issue.created_at).getTime()) / 86_400_000
  if (ageDays > 180) {
    score += 1
    reasons.push(`Open for ${Math.round(ageDays / 30)} months without being picked up`)
  }

  if (score <= 0) return { level: 'easy', hours: '1–3 hrs', reasons }
  if (score <= 2) return { level: 'medium', hours: '3–8 hrs', reasons }
  return { level: 'hard', hours: '8+ hrs', reasons }
}

export function repoNameFromUrl(repositoryUrl: string): string {
  // https://api.github.com/repos/owner/name -> owner/name
  return repositoryUrl.split('/repos/')[1] ?? repositoryUrl
}

export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  const units: [number, string][] = [
    [31536000, 'y'],
    [2592000, 'mo'],
    [604800, 'w'],
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
  ]
  for (const [div, label] of units) {
    if (seconds >= div) return `${Math.floor(seconds / div)}${label} ago`
  }
  return 'just now'
}
