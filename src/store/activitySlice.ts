import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Difficulty, GitHubIssue } from '../lib/types'

export interface ActivityEntry {
  id: number
  title: string
  repo: string
  url: string
  language: string
  difficulty: Difficulty
  openedAt: string // when the user opened it, ISO
}

export type View = 'find' | 'dashboard' | 'history'

interface ActivityState {
  view: View
  saved: ActivityEntry[]
  history: ActivityEntry[]
}

const STORAGE_KEY = 'oss-finder-activity'

function load(): Pick<ActivityState, 'saved' | 'history'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.saved) && Array.isArray(parsed.history)) {
        return { saved: parsed.saved, history: parsed.history }
      }
    }
  } catch {
    // corrupt storage — start fresh
  }
  return { saved: [], history: [] }
}

export function persistActivity(state: ActivityState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ saved: state.saved, history: state.history }))
  } catch {
    // storage full or unavailable — non-fatal
  }
}

export function toEntry(
  issue: GitHubIssue,
  repo: string,
  language: string,
  difficulty: Difficulty,
): ActivityEntry {
  return {
    id: issue.id,
    title: issue.title,
    repo,
    url: issue.html_url,
    language,
    difficulty,
    openedAt: new Date().toISOString(),
  }
}

const activitySlice = createSlice({
  name: 'activity',
  initialState: { view: 'find', ...load() } as ActivityState,
  reducers: {
    setView(state, action: PayloadAction<View>) {
      state.view = action.payload
    },
    toggleSaved(state, action: PayloadAction<ActivityEntry>) {
      const idx = state.saved.findIndex((e) => e.id === action.payload.id)
      if (idx >= 0) state.saved.splice(idx, 1)
      else state.saved.unshift(action.payload)
    },
    recordOpen(state, action: PayloadAction<ActivityEntry>) {
      // Most-recent-first, dedupe by issue id, cap at 200
      state.history = [action.payload, ...state.history.filter((e) => e.id !== action.payload.id)].slice(0, 200)
    },
    clearHistory(state) {
      state.history = []
    },
  },
})

export const { setView, toggleSaved, recordOpen, clearHistory } = activitySlice.actions
export default activitySlice.reducer
