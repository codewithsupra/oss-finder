import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import { githubApi } from './githubApi'
import filtersReducer from './filtersSlice'
import activityReducer, { persistActivity } from './activitySlice'
import settingsReducer, { persistSettings } from './settingsSlice'
import progressReducer, { persistProgress } from './progressSlice'

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    activity: activityReducer,
    settings: settingsReducer,
    progress: progressReducer,
    [githubApi.reducerPath]: githubApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(githubApi.middleware),
})

store.subscribe(() => {
  persistActivity(store.getState().activity)
  persistSettings(store.getState().settings)
  persistProgress(store.getState().progress)
})

// refetchOnFocus / refetchOnReconnect support
setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
