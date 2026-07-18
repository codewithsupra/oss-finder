import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SignInButton } from '@clerk/clerk-react'
import type { GitHubIssue } from '../lib/types'
import { estimateDifficulty, repoNameFromUrl, timeAgo } from '../lib/difficulty'
import { useAppDispatch, useAppSelector } from '../store'
import { recordOpen, toggleSaved, toEntry } from '../store/activitySlice'
import {
  DEMO_TRY_LIMIT,
  FREE_ADVICE_DAILY_LIMIT,
  FREE_REALITY_CHECK_DAILY_LIMIT,
  useAdviceQuota,
  useDemoTry,
  useRealityCheckQuota,
} from '../store/settingsSlice'
import { useLazyRepoPulseQuery, type RepoPulse } from '../store/githubApi'
import { clerkEnabled, useAuth } from '../lib/auth'

function UpgradeCta({ reason }: { reason: string }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
      <p className="text-amber-300">{reason}</p>
      <Link
        to="/pricing"
        className="mt-2 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white transition hover:bg-indigo-500"
      >
        Upgrade to Pro — $5/mo
      </Link>
    </div>
  )
}

const DIFFICULTY_STYLES = {
  easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  hard: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const DIFFICULTY_DOT = { easy: '🟢', medium: '🟡', hard: '🔴' }

const FALLBACK_ADVICE = [
  'Comment on the issue asking to be assigned before writing any code — unclaimed PRs often get closed.',
  'Read CONTRIBUTING.md and the PR template first; follow them exactly.',
  'Reproduce the issue locally and confirm your understanding in a comment before fixing.',
  'Keep the diff minimal — fix only what the issue describes, no drive-by refactors.',
  'Add or update a test that fails without your change and passes with it.',
  'Write a short, plain PR description: what was broken, what you changed, how you verified it.',
]

function AdvicePanel({ issue, repo }: { issue: GitHubIssue; repo: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'fallback' | 'gated-guest' | 'gated-free'>('idle')
  const [advice, setAdvice] = useState<string[]>([])
  const dispatch = useAppDispatch()
  const { signedIn, isPro, has } = useAuth()
  const unlimitedAdvice = isPro || has({ feature: 'unlimited_advice' })
  const demoTriesUsed = useAppSelector((s) => s.settings.demoTriesUsed)
  const adviceUsedToday = useAppSelector((s) => s.settings.adviceUsedToday)
  const guestTriesLeft = DEMO_TRY_LIMIT - demoTriesUsed
  const freeTriesLeft = FREE_ADVICE_DAILY_LIMIT - adviceUsedToday

  const fetchAdvice = async () => {
    if (!unlimitedAdvice) {
      if (!signedIn && guestTriesLeft <= 0) return setState('gated-guest')
      if (signedIn && freeTriesLeft <= 0) return setState('gated-free')
    }
    setState('loading')
    try {
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: issue.title,
          repo,
          body: issue.body,
          labels: issue.labels.map((l) => l.name),
          comments: issue.comments,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      const lines = String(data.advice)
        .split('\n')
        .map((l: string) => l.replace(/^-\s*/, '').trim())
        .filter(Boolean)
      setAdvice(lines)
      setState('done')
      // Real AI runs count against quota; the fallback checklist below never does
      if (!unlimitedAdvice) dispatch(signedIn ? useAdviceQuota() : useDemoTry())
    } catch {
      setAdvice(FALLBACK_ADVICE)
      setState('fallback')
    }
  }

  if (state === 'idle') {
    const triesLeft = signedIn ? freeTriesLeft : guestTriesLeft
    return (
      <button
        onClick={fetchAdvice}
        className="rounded-lg border border-indigo-500/40 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/10"
      >
        ✨ How do I get this merged?
        {!unlimitedAdvice && (
          <span className="ml-1.5 text-slate-500">({triesLeft} left today)</span>
        )}
      </button>
    )
  }
  if (state === 'loading') {
    return <p className="animate-pulse text-xs text-slate-500">Thinking about how you'd get this merged…</p>
  }
  if (state === 'gated-guest') {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
        <p className="text-amber-300">You've used your {DEMO_TRY_LIMIT} free AI advice runs.</p>
        {clerkEnabled ? (
          <SignInButton mode="modal">
            <button className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white transition hover:bg-indigo-500">
              Sign in for {FREE_ADVICE_DAILY_LIMIT}/day free — no card needed
            </button>
          </SignInButton>
        ) : (
          <p className="mt-1 text-slate-400">Sign in for more advice (auth coming to this deployment soon).</p>
        )}
      </div>
    )
  }
  if (state === 'gated-free') {
    return <UpgradeCta reason={`You've used your ${FREE_ADVICE_DAILY_LIMIT} free advice runs for today.`} />
  }
  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
      <p className="mb-2 text-xs font-medium text-indigo-300">
        {state === 'fallback' ? 'Merge checklist (maintainer playbook)' : 'AI merge advice'}
      </p>
      <ul className="space-y-1.5 text-xs text-slate-300">
        {advice.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-indigo-400">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function verdict(pulse: RepoPulse): { icon: string; label: string; cls: string } {
  const daysSincePush = (Date.now() - new Date(pulse.pushedAt).getTime()) / 86_400_000
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

function RealityCheck({ repo }: { repo: string }) {
  const [trigger, { data, isFetching, isError }] = useLazyRepoPulseQuery()
  const [gated, setGated] = useState(false)
  const dispatch = useAppDispatch()
  const { isPro, has } = useAuth()
  const unlimitedChecks = isPro || has({ feature: 'merge_reality_check' })
  const usedToday = useAppSelector((s) => s.settings.realityCheckUsedToday)
  const triesLeft = FREE_REALITY_CHECK_DAILY_LIMIT - usedToday

  const run = () => {
    if (!unlimitedChecks && triesLeft <= 0) return setGated(true)
    if (!unlimitedChecks) dispatch(useRealityCheckQuota())
    trigger(repo)
  }

  if (gated) return <UpgradeCta reason={`You've used your ${FREE_REALITY_CHECK_DAILY_LIMIT} free repo audits for today.`} />

  if (!data && !isFetching && !isError) {
    return (
      <button
        onClick={run}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
        title="Live check: does this repo actually merge outsiders' PRs?"
      >
        🔎 Merge Reality Check
        {!unlimitedChecks && <span className="ml-1.5 text-slate-500">({triesLeft} left today)</span>}
      </button>
    )
  }
  if (isFetching) return <p className="animate-pulse text-xs text-slate-500">Auditing the repo's merge history…</p>
  if (isError || !data)
    return <p className="text-xs text-slate-500">Couldn't audit this repo (rate limit?) — add a GitHub token in Settings.</p>

  const v = verdict(data)
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 text-xs">
      <p className={`font-medium ${v.cls}`}>{v.icon} {v.label}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
        <span>last push {timeAgo(data.pushedAt)}</span>
        <span>
          {data.externalMergedCount}/{data.mergedSampleSize} recent merges from outsiders
        </span>
        {data.medianDaysToMerge !== null && <span>median merge: {data.medianDaysToMerge}d</span>}
        <span>⭐ {data.stars.toLocaleString()}</span>
      </div>
    </div>
  )
}

export function IssueCard({ issue }: { issue: GitHubIssue }) {
  const [showReasons, setShowReasons] = useState(false)
  const dispatch = useAppDispatch()
  const language = useAppSelector((s) => s.filters.activeLanguage) ?? 'unknown'
  const isSaved = useAppSelector((s) => s.activity.saved.some((e) => e.id === issue.id))
  const estimate = useMemo(() => estimateDifficulty(issue), [issue])
  const repo = repoNameFromUrl(issue.repository_url)
  const entry = () => toEntry(issue, repo, language, estimate.level)

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-indigo-400">{repo}</p>
          <h3 className="mt-0.5 text-sm font-semibold text-slate-100 leading-snug">
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dispatch(recordOpen(entry()))}
              className="hover:text-indigo-300 hover:underline"
            >
              {issue.title}
            </a>
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => dispatch(toggleSaved(entry()))}
            aria-label={isSaved ? 'Unsave issue' : 'Save issue'}
            title={isSaved ? 'Saved — click to remove' : 'Save for later'}
            className={`rounded-lg border px-2 py-1.5 text-xs transition ${
              isSaved
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                : 'border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-400'
            }`}
          >
            {isSaved ? '★' : '☆'}
          </button>
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => dispatch(recordOpen(entry()))}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
          >
            Open ↗
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <button
          onClick={() => setShowReasons((v) => !v)}
          className={`rounded-md border px-2 py-0.5 font-medium transition ${DIFFICULTY_STYLES[estimate.level]}`}
          title="Click to see why"
        >
          {DIFFICULTY_DOT[estimate.level]} {estimate.level} · est. {estimate.hours}
        </button>
        <span>💬 {issue.comments}</span>
        <span>opened {timeAgo(issue.created_at)}</span>
        <span>updated {timeAgo(issue.updated_at)}</span>
      </div>

      {showReasons && (
        <ul className="mt-2 space-y-1 rounded-lg bg-slate-950/60 p-3 text-xs text-slate-400">
          {estimate.reasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      )}

      {issue.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {issue.labels.slice(0, 6).map((label) => (
            <span
              key={label.id}
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{ backgroundColor: `#${label.color}22`, color: `#${label.color}` }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <AdvicePanel issue={issue} repo={repo} />
        <RealityCheck repo={repo} />
      </div>
    </article>
  )
}
