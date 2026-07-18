import { useState } from 'react'

export interface WeekBar {
  label: string
  value: number
}

const CHART_HEIGHT = 120
const HUE = '#818cf8' // indigo-400 — single hue for a magnitude series, no legend needed

export function WeeklyActivityChart({ title, weeks }: { title: string; weeks: WeekBar[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(1, ...weeks.map((w) => w.value))
  const hasData = weeks.some((w) => w.value > 0)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-200">{title}</h3>
      {!hasData ? (
        <p className="text-xs text-slate-500">No activity yet.</p>
      ) : (
        <div className="relative" style={{ height: CHART_HEIGHT }}>
          {/* Gridlines at 0/50/100% — recessive, structural reference only */}
          {[0, 0.5, 1].map((f) => (
            <div
              key={f}
              className="absolute left-0 right-0 border-t border-slate-800"
              style={{ bottom: f * CHART_HEIGHT }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {weeks.map((w, i) => {
              const barHeight = Math.max(2, (w.value / max) * CHART_HEIGHT)
              const isMax = w.value === max && max > 0
              return (
                <div key={w.label} className="group relative flex-1">
                  {/* value at the tip — only the max bar is directly labeled */}
                  {isMax && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-300">
                      {w.value}
                    </span>
                  )}
                  <div
                    tabIndex={0}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    role="img"
                    aria-label={`${w.label}: ${w.value}`}
                    className="mx-auto max-w-6 cursor-default outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
                    style={{
                      height: barHeight,
                      background: HUE,
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  {hovered === i && (
                    <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-lg">
                      <span className="text-slate-100">{w.value}</span>{' '}
                      <span className="text-slate-400">{w.label}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>{weeks[0]?.label}</span>
        <span>{weeks[weeks.length - 1]?.label}</span>
      </div>
    </div>
  )
}
