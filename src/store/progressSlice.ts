import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface TrackedRepo {
  repo: string
  addedAt: string
}

export interface XpEntry {
  repo: string
  prNumber: number
  prTitle: string
  mergedAt: string
  xp: number
  awardedAt: string
}

export interface ProgressState {
  trackedRepos: TrackedRepo[]
  ledger: XpEntry[]
}

const STORAGE_KEY = 'oss-finder-progress'
export const XP_PER_MERGE = 50
export const MAX_TRACKED_REPOS = 10

export interface LevelInfo {
  level: number
  title: string
  xpIntoLevel: number
  xpForNextLevel: number
}

const LEVEL_TITLES = ['Newcomer', 'Contributor', 'Regular', 'Core Contributor', 'OSS Veteran']
const XP_PER_LEVEL = 200

export function levelFor(totalXp: number): LevelInfo {
  const level = Math.min(LEVEL_TITLES.length, Math.floor(totalXp / XP_PER_LEVEL) + 1)
  const xpIntoLevel = totalXp - (level - 1) * XP_PER_LEVEL
  return {
    level,
    title: LEVEL_TITLES[level - 1],
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
  }
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p.trackedRepos) && Array.isArray(p.ledger)) {
        return { trackedRepos: p.trackedRepos, ledger: p.ledger }
      }
    }
  } catch {
    // corrupt storage — start fresh
  }
  return { trackedRepos: [], ledger: [] }
}

export function persistProgress(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // non-fatal
  }
}

const progressSlice = createSlice({
  name: 'progress',
  initialState: load(),
  reducers: {
    addTrackedRepo(state, action: PayloadAction<string>) {
      const repo = action.payload.trim()
      if (!repo || state.trackedRepos.some((r) => r.repo.toLowerCase() === repo.toLowerCase())) return
      state.trackedRepos.push({ repo, addedAt: new Date().toISOString() })
    },
    removeTrackedRepo(state, action: PayloadAction<string>) {
      state.trackedRepos = state.trackedRepos.filter((r) => r.repo !== action.payload)
    },
    // Awards XP only for PR numbers not already in the ledger for that repo —
    // this is the dedupe that makes "sync" idempotent no matter how often it runs.
    recordMergedPRs(
      state,
      action: PayloadAction<{ repo: string; prs: { number: number; title: string; mergedAt: string }[] }>,
    ) {
      const { repo, prs } = action.payload
      const seen = new Set(state.ledger.filter((e) => e.repo === repo).map((e) => e.prNumber))
      const now = new Date().toISOString()
      for (const pr of prs) {
        if (seen.has(pr.number)) continue
        state.ledger.push({
          repo,
          prNumber: pr.number,
          prTitle: pr.title,
          mergedAt: pr.mergedAt,
          xp: XP_PER_MERGE,
          awardedAt: now,
        })
        seen.add(pr.number)
      }
    },
  },
})

export const { addTrackedRepo, removeTrackedRepo, recordMergedPRs } = progressSlice.actions
export default progressSlice.reducer
