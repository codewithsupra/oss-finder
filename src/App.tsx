import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { SkillInput } from './components/SkillInput'
import { FilterBar } from './components/FilterBar'
import { IssueList } from './components/IssueList'
import { Dashboard } from './components/Dashboard'
import { History } from './components/History'
import { Settings } from './components/Settings'
import { Pricing } from './components/Pricing'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAppDispatch, useAppSelector } from './store'
import { addSkill } from './store/filtersSlice'

function FindView() {
  const dispatch = useAppDispatch()
  const skills = useAppSelector((s) => s.filters.skills)
  const defaultLanguage = useAppSelector((s) => s.settings.defaultLanguage)

  useEffect(() => {
    if (skills.length === 0 && defaultLanguage) dispatch(addSkill(defaultLanguage))
    // Apply the saved default once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Find your first contribution</h2>
          <p className="mt-1 text-sm text-slate-400">
            Unassigned <span className="text-slate-300">good first issues</span> from active repos,
            with an estimated difficulty so you know what you're signing up for.
          </p>
        </div>
        <SkillInput />
        <FilterBar />
      </section>
      <IssueList />
    </>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/app"
          element={
            <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
              <FindView />
            </main>
          }
        />
        <Route
          path="/app/dashboard"
          element={
            <main className="mx-auto max-w-5xl px-4 py-8">
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            </main>
          }
        />
        <Route
          path="/app/history"
          element={
            <main className="mx-auto max-w-5xl px-4 py-8">
              <ProtectedRoute><History /></ProtectedRoute>
            </main>
          }
        />
        <Route
          path="/settings"
          element={
            <main className="mx-auto max-w-5xl px-4 py-8">
              <ProtectedRoute><Settings /></ProtectedRoute>
            </main>
          }
        />
        <Route
          path="/pricing"
          element={
            <main className="mx-auto max-w-5xl px-4 py-8">
              <Pricing />
            </main>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
