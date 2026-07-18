import { useMemo } from 'react'
import { useAppSelector } from '../store'
import type { ActivityEntry } from '../store/activitySlice'
import type { Difficulty } from '../lib/types'
import { levelFor } from '../store/progressSlice'
import { WeeklyActivityChart, type WeekBar } from './charts/WeeklyActivityChart'
import { DifficultyChart } from './charts/DifficultyChart'

function countBy<K extends string>(items: ActivityEntry[], key: (e: ActivityEntry) => K) {
  const counts = new Map<K, number>()
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

const WEEK_MS = 7 * 86_400_000
const WEEK_LABEL_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

// Buckets items into the last `count` calendar weeks (oldest first) by date,
// summing `weight` per item (defaults to a plain count of 1 per item).
function bucketByWeek<T>(
  items: T[],
  count: number,
  getDate: (item: T) => string,
  getWeight: (item: T) => number = () => 1,
): WeekBar[] {
  const weekStart = (t: number) => Math.floor(t / WEEK_MS) * WEEK_MS
  const currentWeekStart = weekStart(Date.now())
  const buckets = new Map<number, number>()
  for (let i = 0; i < count; i++) buckets.set(currentWeekStart - i * WEEK_MS, 0)
  for (const item of items) {
    const ws = weekStart(new Date(getDate(item)).getTime())
    if (buckets.has(ws)) buckets.set(ws, (buckets.get(ws) ?? 0) + getWeight(item))
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, value]) => ({ label: WEEK_LABEL_FMT.format(new Date(ts)), value }))
}

function BarList({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map(([, n]) => n))
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500">No data yet — open some issues from the Find tab.</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 6).map(([label, n]) => (
            <li key={label} className="flex items-center gap-3 text-xs">
              <span className="w-24 truncate text-slate-400" title={label}>{label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(n / max) * 100}%` }}
                  role="img"
                  aria-label={`${label}: ${n}`}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-slate-300">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-2xl font-bold tabular-nums text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  )
}

export function Dashboard() {
  const { saved, history } = useAppSelector((s) => s.activity)
  const ledger = useAppSelector((s) => s.progress.ledger)

  const stats = useMemo(() => {
    const week = Date.now() - 7 * 86_400_000
    return {
      opened: history.length,
      openedThisWeek: history.filter((e) => new Date(e.openedAt).getTime() > week).length,
      saved: saved.length,
      repos: new Set(history.map((e) => e.repo)).size,
    }
  }, [saved, history])

  const byLanguage = useMemo(() => countBy(history, (e) => e.language), [history])
  const byRepo = useMemo(() => countBy(history, (e) => e.repo), [history])
  const difficultyCounts = useMemo(() => {
    const counts: Partial<Record<Difficulty, number>> = {}
    for (const e of history) counts[e.difficulty] = (counts[e.difficulty] ?? 0) + 1
    return counts
  }, [history])

  const weeklyActivity = useMemo(() => bucketByWeek(history, 8, (e) => e.openedAt), [history])
  const weeklyXp = useMemo(() => bucketByWeek(ledger, 8, (e) => e.awardedAt, (e) => e.xp), [ledger])
  const totalXp = useMemo(() => ledger.reduce((sum, e) => sum + e.xp, 0), [ledger])
  const { level, title: levelTitle } = levelFor(totalXp)

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your contribution activity</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Issues opened" value={stats.opened} />
        <StatTile label="Opened this week" value={stats.openedThisWeek} />
        <StatTile label="Saved for later" value={stats.saved} />
        <StatTile label="Repos explored" value={stats.repos} />
      </div>

      {totalXp > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile label={`Total XP · Level ${level} (${levelTitle})`} value={`${totalXp.toLocaleString()} XP`} />
          <WeeklyActivityChart title="XP earned per week" weeks={weeklyXp} />
        </div>
      )}

      <WeeklyActivityChart title="Issues opened per week" weeks={weeklyActivity} />

      <div className="grid gap-3 sm:grid-cols-2">
        <BarList title="By language" data={byLanguage} />
        <DifficultyChart counts={difficultyCounts} />
      </div>
      <BarList title="Top repos" data={byRepo} />
      {saved.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">⭐ Saved issues</h3>
          <ul className="space-y-2">
            {saved.map((e) => (
              <li key={e.id} className="text-sm">
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-indigo-300 hover:underline">
                  {e.title}
                </a>
                <span className="ml-2 text-xs text-indigo-400">{e.repo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
