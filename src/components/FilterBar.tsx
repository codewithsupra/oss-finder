import { useAppDispatch, useAppSelector } from '../store'
import { setActivity, setDifficulty, setSort } from '../store/filtersSlice'
import type { ActivityFilter, SortOption } from '../lib/types'

const ACTIVITY_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'week', label: 'Active this week' },
  { value: 'month', label: 'Active this month' },
  { value: '3months', label: 'Active in 3 months' },
  { value: 'any', label: 'Any time' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created', label: 'Newest' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'comments', label: 'Most discussed' },
  { value: 'reactions', label: 'Most reactions' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All levels' },
  { value: 'easy', label: '🟢 Easy' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'hard', label: '🔴 Hard' },
] as const

const selectClass =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-500'

export function FilterBar() {
  const dispatch = useAppDispatch()
  const { difficulty, activity, sort } = useAppSelector((s) => s.filters)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={difficulty}
        onChange={(e) => dispatch(setDifficulty(e.target.value as typeof difficulty))}
        className={selectClass}
        aria-label="Filter by difficulty"
      >
        {DIFFICULTY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={activity}
        onChange={(e) => dispatch(setActivity(e.target.value as ActivityFilter))}
        className={selectClass}
        aria-label="Filter by last activity"
      >
        {ACTIVITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => dispatch(setSort(e.target.value as SortOption))}
        className={selectClass}
        aria-label="Sort results"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
