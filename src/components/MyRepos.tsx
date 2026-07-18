import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setGithubUsername } from '../store/settingsSlice'
import {
  addTrackedRepo,
  levelFor,
  removeTrackedRepo,
  recordMergedPRs,
  MAX_TRACKED_REPOS,
  XP_PER_MERGE,
} from '../store/progressSlice'
import { useLazyCheckRepoExistsQuery, useLazyMergedPRsByAuthorQuery } from '../store/githubApi'

function XpMeter() {
  const totalXp = useAppSelector((s) => s.progress.ledger.reduce((sum, e) => sum + e.xp, 0))
  const { level, title, xpIntoLevel, xpForNextLevel } = levelFor(totalXp)
  const pct = Math.min(100, (xpIntoLevel / xpForNextLevel) * 100)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-bold text-slate-100">{totalXp.toLocaleString()} XP</p>
        <p className="text-sm font-medium text-indigo-300">Level {level} · {title}</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {level < 5 ? `${xpForNextLevel - xpIntoLevel} XP to Level ${level + 1}` : 'Max level reached'}
      </p>
    </div>
  )
}

function RepoRow({ repo }: { repo: string }) {
  const dispatch = useAppDispatch()
  const username = useAppSelector((s) => s.settings.githubUsername)
  const [triggerSync, { isFetching }] = useLazyMergedPRsByAuthorQuery()
  const [status, setStatus] = useState<string | null>(null)
  const mergedCount = useAppSelector((s) => s.progress.ledger.filter((e) => e.repo === repo).length)

  const sync = async () => {
    if (!username) {
      setStatus('Set your GitHub username in Settings first.')
      return
    }
    setStatus(null)
    try {
      const prs = await triggerSync({ repo, username }).unwrap()
      dispatch(recordMergedPRs({ repo, prs }))
      setStatus(
        prs.length > 0
          ? `Synced — ${prs.length} merged PR${prs.length === 1 ? '' : 's'} found for your account in this repo.`
          : 'Synced — no merged PRs found for your account in this repo.',
      )
    } catch (err) {
      // GitHub's search API can 422 on `repo:` for certain repos (e.g. ones with
      // rename/migration history, like facebook/react) when unauthenticated —
      // the repo name is correct, GitHub just can't verify it without a token.
      const status = (err as { status?: number } | undefined)?.status
      setStatus(
        status === 422
          ? "GitHub couldn't verify this repo without an access token — add a GitHub token in Settings and try again."
          : 'Sync failed — check the repo name and try again.',
      )
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-slate-100 hover:text-indigo-300 hover:underline"
          >
            {repo}
          </a>
          <p className="mt-0.5 text-xs text-slate-500">{mergedCount} merged PR{mergedCount === 1 ? '' : 's'} tracked · {mergedCount * XP_PER_MERGE} XP earned</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={sync}
            disabled={isFetching}
            className="rounded-lg border border-indigo-500/40 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/10 disabled:opacity-50"
          >
            {isFetching ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            onClick={() => dispatch(removeTrackedRepo(repo))}
            aria-label="Stop tracking"
            className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-500 transition hover:border-red-500/50 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      </div>
      {status && <p className="mt-2 text-xs text-slate-400">{status}</p>}
    </div>
  )
}

export function MyRepos() {
  const dispatch = useAppDispatch()
  const username = useAppSelector((s) => s.settings.githubUsername)
  const trackedRepos = useAppSelector((s) => s.progress.trackedRepos)
  const [repoInput, setRepoInput] = useState('')
  const [addError, setAddError] = useState('')
  const [checkRepo, { isFetching: isChecking }] = useLazyCheckRepoExistsQuery()

  const addRepo = async () => {
    const repo = repoInput.trim()
    setAddError('')
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      setAddError('Format: owner/repo (e.g. facebook/react)')
      return
    }
    if (trackedRepos.length >= MAX_TRACKED_REPOS) {
      setAddError(`You can track up to ${MAX_TRACKED_REPOS} repos.`)
      return
    }
    const exists = await checkRepo(repo).unwrap().catch(() => false)
    if (!exists) {
      setAddError("Repo not found — check the spelling.")
      return
    }
    dispatch(addTrackedRepo(repo))
    setRepoInput('')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Repos</h2>
        <p className="mt-1 text-sm text-slate-400">
          Track repos you contribute to. Sync pulls your merged PRs from GitHub and awards{' '}
          {XP_PER_MERGE} XP each — deduped, so syncing twice never double-counts.
        </p>
      </div>

      <XpMeter />

      {!username && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
          <p className="text-amber-300">Set your GitHub username in Settings to enable syncing.</p>
          <input
            value={username}
            onChange={(e) => dispatch(setGithubUsername(e.target.value))}
            placeholder="your-github-username"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRepo()}
          placeholder="owner/repo"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <button
          onClick={addRepo}
          disabled={isChecking}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {isChecking ? 'Checking…' : 'Track'}
        </button>
      </div>
      {addError && <p className="text-xs text-red-400">{addError}</p>}

      {trackedRepos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          No repos tracked yet. Add one above to start earning XP for merged PRs.
        </div>
      ) : (
        <div className="space-y-3">
          {trackedRepos.map((r) => (
            <RepoRow key={r.repo} repo={r.repo} />
          ))}
        </div>
      )}
    </div>
  )
}
