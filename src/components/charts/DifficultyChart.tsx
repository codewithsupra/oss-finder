import { useState } from 'react'
import type { Difficulty } from '../../lib/types'

// Fixed status palette — good/warning/critical, never reused for arbitrary
// series. Matches the 🟢🟡🔴 dots used elsewhere for the same concept.
const STATUS_COLOR: Record<Difficulty, string> = {
  easy: '#0ca30c',
  medium: '#fab219',
  hard: '#d03b3b',
}
const STATUS_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}
const ORDER: Difficulty[] = ['easy', 'medium', 'hard']

export function DifficultyChart({ counts }: { counts: Partial<Record<Difficulty, number>> }) {
  const [hovered, setHovered] = useState<Difficulty | null>(null)
  const max = Math.max(1, ...ORDER.map((d) => counts[d] ?? 0))
  const total = ORDER.reduce((sum, d) => sum + (counts[d] ?? 0), 0)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">By difficulty</h3>
        {/* Legend — required whenever a chart carries 2+ distinctly-colored series */}
        <div className="flex gap-3">
          {ORDER.map((d) => (
            <span key={d} className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[d] }} />
              {STATUS_LABEL[d]}
            </span>
          ))}
        </div>
      </div>
      {total === 0 ? (
        <p className="text-xs text-slate-500">No data yet — open some issues from the Find tab.</p>
      ) : (
        <ul className="space-y-2">
          {ORDER.map((d) => {
            const n = counts[d] ?? 0
            return (
              <li key={d} className="flex items-center gap-3 text-xs">
                <span className="w-16 shrink-0 text-slate-400">{STATUS_LABEL[d]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    tabIndex={0}
                    onMouseEnter={() => setHovered(d)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(d)}
                    onBlur={() => setHovered(null)}
                    role="img"
                    aria-label={`${STATUS_LABEL[d]}: ${n}`}
                    className="h-full rounded-full outline-none transition-opacity hover:opacity-80"
                    style={{ width: `${(n / max) * 100}%`, background: STATUS_COLOR[d] }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right tabular-nums text-slate-300">
                  {hovered === d ? <strong className="text-slate-100">{n}</strong> : n}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
