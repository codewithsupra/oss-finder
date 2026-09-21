import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignInButton } from '@clerk/clerk-react'
import { extractResumeText } from '../lib/resume'
import { useAppDispatch, useAppSelector } from '../store'
import { addSkill } from '../store/filtersSlice'
import { useLazyRecommendReposForLanguagesQuery, type RecommendedRepo } from '../store/githubApi'
import {
  RESUME_DEMO_LIMIT,
  FREE_RESUME_DAILY_LIMIT,
  consumeResumeDemoTry,
  consumeResumeQuota,
} from '../store/settingsSlice'
import { clerkEnabled, useAuth } from '../lib/auth'

type Phase = 'idle' | 'extracting' | 'analyzing' | 'searching' | 'done' | 'error' | 'gated-guest' | 'gated-free'

export function ResumeMatch() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [summary, setSummary] = useState('')
  const [repos, setRepos] = useState<RecommendedRepo[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { signedIn, isPro, has } = useAuth()
  const [triggerRepoSearch] = useLazyRecommendReposForLanguagesQuery()

  const unlimited = isPro || has({ feature: 'resume_match' })
  const guestTriesUsed = useAppSelector((s) => s.settings.resumeTriesUsed)
  const freeUsedToday = useAppSelector((s) => s.settings.resumeUsedToday)
  const guestTriesLeft = RESUME_DEMO_LIMIT - guestTriesUsed
  const freeTriesLeft = FREE_RESUME_DAILY_LIMIT - freeUsedToday

  const handleFile = async (file: File) => {
    if (!unlimited) {
      if (!signedIn && guestTriesLeft <= 0) return setPhase('gated-guest')
      if (signedIn && freeTriesLeft <= 0) return setPhase('gated-free')
    }
    setErrorMsg('')
    setPhase('extracting')
    try {
      const text = await extractResumeText(file)
      setPhase('analyzing')
      const res = await fetch('/api/resume-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const { languages, summary: sum } = await res.json()
      setSummary(sum ?? '')

      setPhase('searching')
      const found = await triggerRepoSearch(languages).unwrap()
      if (found.length === 0) throw new Error('No matching repos found — try a different resume.')
      setRepos(found)
      setPhase('done')
      if (!unlimited) dispatch(signedIn ? consumeResumeQuota() : consumeResumeDemoTry())
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('error')
    }
  }

  const openInFinder = (language: string) => {
    dispatch(addSkill(language))
    navigate('/app')
  }

  const triesLeft = signedIn ? freeTriesLeft : guestTriesLeft

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Resume → repo match</h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload your resume. We extract your top languages entirely in your browser — the file
          itself never leaves your device, only the extracted text is analyzed — then find 3 real
          repos with open good-first-issues in those languages.
        </p>
      </div>

      {(phase === 'idle' || phase === 'error') && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          <p className="text-3xl">📄</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Upload resume (PDF, .txt, or .md)
          </button>
          {!unlimited && (
            <p className="mt-2 text-xs text-slate-500">
              {triesLeft} {signedIn ? (triesLeft === 1 ? 'try' : 'tries') : (triesLeft === 1 ? 'free try' : 'free tries')} left
            </p>
          )}
          {phase === 'error' && <p className="mt-3 text-xs text-red-400">{errorMsg}</p>}
        </div>
      )}

      {(phase === 'extracting' || phase === 'analyzing' || phase === 'searching') && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="animate-pulse text-sm text-slate-400">
            {phase === 'extracting' && 'Reading your resume locally…'}
            {phase === 'analyzing' && 'Identifying your strongest languages…'}
            {phase === 'searching' && 'Finding repos with open good-first-issues…'}
          </p>
        </div>
      )}

      {phase === 'gated-guest' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center text-sm">
          <p className="text-amber-300">You've used your {RESUME_DEMO_LIMIT} free resume match.</p>
          {clerkEnabled ? (
            <SignInButton mode="modal">
              <button className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500">
                Sign in for {FREE_RESUME_DAILY_LIMIT}/day free
              </button>
            </SignInButton>
          ) : (
            <p className="mt-1 text-slate-400">Sign in for more (auth coming to this deployment soon).</p>
          )}
        </div>
      )}

      {phase === 'gated-free' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center text-sm">
          <p className="text-amber-300">You've used your {FREE_RESUME_DAILY_LIMIT} free resume matches for today.</p>
          <a href="/pricing" className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500">
            Upgrade to Pro — $5/mo
          </a>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-3">
          {summary && <p className="rounded-lg bg-slate-900/60 p-3 text-sm text-slate-300">{summary}</p>}
          {repos.map((r) => (
            <div key={r.fullName} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-indigo-400">{r.language}</p>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-100 hover:text-indigo-300 hover:underline"
                  >
                    {r.fullName}
                  </a>
                  {r.description && <p className="mt-1 text-xs text-slate-400">{r.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">⭐ {r.stars.toLocaleString()} · {r.openIssues} open issues</p>
                </div>
                <button
                  onClick={() => openInFinder(r.language)}
                  className="shrink-0 rounded-lg border border-indigo-500/40 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/10"
                >
                  Find issues here →
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setPhase('idle')}
            className="text-xs text-slate-500 underline hover:text-slate-300"
          >
            Try another resume
          </button>
        </div>
      )}
    </div>
  )
}
