import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { useSearchIssuesQuery } from '../store/githubApi'
import { setPage } from '../store/filtersSlice'
import { estimateDifficulty } from '../lib/difficulty'
import { IssueCard } from './IssueCard'

export function IssueList() {
  const dispatch = useAppDispatch()
  const { activeLanguage, difficulty, activity, sort, page } = useAppSelector((s) => s.filters)

  const { data, isLoading, isFetching, isError, error, refetch } = useSearchIssuesQuery(
    { languages: activeLanguage ? [activeLanguage] : [], activity, sort, page },
    { skip: !activeLanguage },
  )

  const filtered = useMemo(() => {
    if (!data) return []
    if (difficulty === 'all') return data.items
    return data.items.filter((issue) => estimateDifficulty(issue).level === difficulty)
  }, [data, difficulty])

  if (!activeLanguage) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
        <p className="text-3xl">👆</p>
        <p className="mt-2 text-sm">Add a language above to find issues you can contribute to today.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading issues">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
        ))}
      </div>
    )
  }

  if (isError) {
    const status = (error as { status?: number })?.status
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-400">
          {status === 403
            ? 'GitHub rate limit hit. Add a VITE_GITHUB_TOKEN to .env.local for 30 requests/min, or wait a minute.'
            : 'Failed to fetch issues from GitHub.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 transition hover:border-indigo-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {data?.total_count.toLocaleString()} open issues in {activeLanguage}
          {difficulty !== 'all' && ` · showing ${filtered.length} ${difficulty} on this page`}
        </span>
        <span>page {page}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          No {difficulty !== 'all' ? difficulty : ''} issues on this page — try the next page or loosen the filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          disabled={page === 1 || isFetching}
          onClick={() => dispatch(setPage(page - 1))}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 transition enabled:hover:border-indigo-500 disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          disabled={isFetching || (data ? page * 20 >= Math.min(data.total_count, 1000) : true)}
          onClick={() => dispatch(setPage(page + 1))}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 transition enabled:hover:border-indigo-500 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
