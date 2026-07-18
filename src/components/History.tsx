import { useAppDispatch, useAppSelector } from '../store'
import { clearHistory } from '../store/activitySlice'
import { timeAgo } from '../lib/difficulty'

const DOT = { easy: '🟢', medium: '🟡', hard: '🔴' }

export function History() {
  const dispatch = useAppDispatch()
  const history = useAppSelector((s) => s.activity.history)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">History</h2>
        {history.length > 0 && (
          <button
            onClick={() => dispatch(clearHistory())}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
          >
            Clear history
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
          <p className="text-3xl">📭</p>
          <p className="mt-2 text-sm">Issues you open will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((e) => (
            <li key={`${e.id}-${e.openedAt}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className="min-w-0">
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-slate-200 hover:text-indigo-300 hover:underline">
                  {e.title}
                </a>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="text-indigo-400">{e.repo}</span> · {e.language} · {DOT[e.difficulty]} {e.difficulty}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{timeAgo(e.openedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
