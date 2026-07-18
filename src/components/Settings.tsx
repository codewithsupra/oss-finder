import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setDefaultLanguage, setGithubToken } from '../store/settingsSlice'
import { clearHistory } from '../store/activitySlice'
import { addSkill } from '../store/filtersSlice'

const LANGUAGES = ['', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby']

export function Settings() {
  const dispatch = useAppDispatch()
  const { githubToken, defaultLanguage } = useAppSelector((s) => s.settings)
  const [tokenInput, setTokenInput] = useState(githubToken)
  const [savedFlash, setSavedFlash] = useState(false)

  const saveToken = () => {
    dispatch(setGithubToken(tokenInput))
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-slate-200">GitHub personal access token</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Raises your search rate limit from 10 to 30 requests/min and makes Merge Reality Check
          much more reliable. No scopes needed. Stored <span className="text-slate-300">only in
          your browser</span> — it never touches our server.{' '}
          <a
            href="https://github.com/settings/tokens/new?description=OSS+Finder"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Create one ↗
          </a>
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <button
            onClick={saveToken}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            {savedFlash ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        {githubToken && (
          <button
            onClick={() => {
              dispatch(setGithubToken(''))
              setTokenInput('')
            }}
            className="mt-2 text-xs text-slate-500 underline hover:text-red-400"
          >
            Remove stored token
          </button>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Default language</h3>
        <p className="mt-1 text-xs text-slate-400">Pre-selected when you open the finder.</p>
        <select
          value={defaultLanguage}
          onChange={(e) => {
            dispatch(setDefaultLanguage(e.target.value))
            if (e.target.value) dispatch(addSkill(e.target.value))
          }}
          className="mt-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l || 'None'}</option>
          ))}
        </select>
      </section>

      <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <h3 className="text-sm font-semibold text-red-300">Danger zone</h3>
        <p className="mt-1 text-xs text-slate-400">Clears your viewing history (saved issues are kept).</p>
        <button
          onClick={() => dispatch(clearHistory())}
          className="mt-3 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Clear history
        </button>
      </section>
    </div>
  )
}
