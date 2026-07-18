import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ActivityFilter, Difficulty, SortOption } from '../lib/types'

export interface FiltersState {
  skills: string[]
  activeLanguage: string | null
  difficulty: Difficulty | 'all'
  activity: ActivityFilter
  sort: SortOption
  page: number
}

const initialState: FiltersState = {
  skills: [],
  activeLanguage: null,
  difficulty: 'all',
  activity: 'month',
  sort: 'created',
  page: 1,
}

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    addSkill(state, action: PayloadAction<string>) {
      const skill = action.payload.trim()
      if (!skill) return
      const exists = state.skills.some((s) => s.toLowerCase() === skill.toLowerCase())
      if (!exists) state.skills.push(skill)
      if (!state.activeLanguage) state.activeLanguage = skill
      state.page = 1
    },
    removeSkill(state, action: PayloadAction<string>) {
      state.skills = state.skills.filter((s) => s !== action.payload)
      if (state.activeLanguage === action.payload) {
        state.activeLanguage = state.skills[0] ?? null
      }
      state.page = 1
    },
    setActiveLanguage(state, action: PayloadAction<string>) {
      state.activeLanguage = action.payload
      state.page = 1
    },
    setDifficulty(state, action: PayloadAction<FiltersState['difficulty']>) {
      state.difficulty = action.payload
    },
    setActivity(state, action: PayloadAction<ActivityFilter>) {
      state.activity = action.payload
      state.page = 1
    },
    setSort(state, action: PayloadAction<SortOption>) {
      state.sort = action.payload
      state.page = 1
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload
    },
  },
})

export const {
  addSkill,
  removeSkill,
  setActiveLanguage,
  setDifficulty,
  setActivity,
  setSort,
  setPage,
} = filtersSlice.actions
export default filtersSlice.reducer
