import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface SettingsState {
  githubToken: string
  githubUsername: string
  defaultLanguage: string
  demoTriesUsed: number
  resumeTriesUsed: number
  dailyUsageDate: string // YYYY-MM-DD, resets counters below when it changes
  adviceUsedToday: number
  realityCheckUsedToday: number
  resumeUsedToday: number
}

const STORAGE_KEY = 'oss-finder-settings'
export const DEMO_TRY_LIMIT = 2
export const RESUME_DEMO_LIMIT = 1
export const FREE_ADVICE_DAILY_LIMIT = 5
export const FREE_REALITY_CHECK_DAILY_LIMIT = 3
export const FREE_RESUME_DAILY_LIMIT = 2

function today() {
  return new Date().toISOString().slice(0, 10)
}

function load(): SettingsState {
  const base: SettingsState = {
    githubToken: '',
    githubUsername: '',
    defaultLanguage: '',
    demoTriesUsed: 0,
    resumeTriesUsed: 0,
    dailyUsageDate: today(),
    adviceUsedToday: 0,
    realityCheckUsedToday: 0,
    resumeUsedToday: 0,
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      const sameDay = p.dailyUsageDate === today()
      return {
        githubToken: typeof p.githubToken === 'string' ? p.githubToken : base.githubToken,
        githubUsername: typeof p.githubUsername === 'string' ? p.githubUsername : base.githubUsername,
        defaultLanguage: typeof p.defaultLanguage === 'string' ? p.defaultLanguage : base.defaultLanguage,
        demoTriesUsed: typeof p.demoTriesUsed === 'number' ? p.demoTriesUsed : base.demoTriesUsed,
        resumeTriesUsed: typeof p.resumeTriesUsed === 'number' ? p.resumeTriesUsed : base.resumeTriesUsed,
        dailyUsageDate: today(),
        adviceUsedToday: sameDay && typeof p.adviceUsedToday === 'number' ? p.adviceUsedToday : 0,
        realityCheckUsedToday: sameDay && typeof p.realityCheckUsedToday === 'number' ? p.realityCheckUsedToday : 0,
        resumeUsedToday: sameDay && typeof p.resumeUsedToday === 'number' ? p.resumeUsedToday : 0,
      }
    }
  } catch {
    // corrupt storage — defaults
  }
  return base
}

export function persistSettings(state: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // non-fatal
  }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: load(),
  reducers: {
    setGithubToken(state, action: PayloadAction<string>) {
      state.githubToken = action.payload.trim()
    },
    setGithubUsername(state, action: PayloadAction<string>) {
      state.githubUsername = action.payload.trim()
    },
    setDefaultLanguage(state, action: PayloadAction<string>) {
      state.defaultLanguage = action.payload
    },
    consumeDemoTry(state) {
      state.demoTriesUsed += 1
    },
    consumeResumeDemoTry(state) {
      state.resumeTriesUsed += 1
    },
    consumeAdviceQuota(state) {
      state.adviceUsedToday += 1
    },
    consumeRealityCheckQuota(state) {
      state.realityCheckUsedToday += 1
    },
    consumeResumeQuota(state) {
      state.resumeUsedToday += 1
    },
  },
})

export const {
  setGithubToken,
  setGithubUsername,
  setDefaultLanguage,
  consumeDemoTry,
  consumeResumeDemoTry,
  consumeAdviceQuota,
  consumeRealityCheckQuota,
  consumeResumeQuota,
} = settingsSlice.actions
export default settingsSlice.reducer
