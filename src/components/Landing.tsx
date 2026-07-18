import { Link } from 'react-router-dom'
import { SignInButton } from '@clerk/clerk-react'
import { clerkEnabled, useAuth } from '../lib/auth'

const FEATURES = [
  {
    icon: '🎯',
    title: 'Matched to your stack',
    body: 'Type your languages and get unassigned good-first-issues from repos that were active this month — everything shown is actually claimable.',
  },
  {
    icon: '⏱️',
    title: 'Honest difficulty estimates',
    body: 'Every issue gets an Easy/Medium/Hard call with estimated hours — and you can click it to see exactly why. No black-box magic.',
  },
  {
    icon: '🔎',
    title: 'Merge Reality Check',
    body: 'One click tells you if a repo actually merges outsiders’ PRs: maintainer activity, external-contributor merge rate, median days-to-merge. Stop donating labor to dead repos.',
  },
  {
    icon: '✨',
    title: 'AI merge advice',
    body: 'Per-issue coaching from an AI maintainer: how to claim it, what to investigate first, and what reviewers of that repo will look for in your PR.',
  },
]

export function Landing() {
  const { signedIn } = useAuth()

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-20 text-center">
        <p className="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
          Free · Live GitHub data · No fluff
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Your first open-source PR,{' '}
          <span className="text-indigo-400">without the guesswork</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Other tools show you issues. OSS Finder shows you issues in repos that actually merge
          strangers&rsquo; PRs — with difficulty estimates and AI coaching to get yours accepted.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/app"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Try it — no sign-up needed
          </Link>
          {clerkEnabled && !signedIn && (
            <SignInButton mode="modal">
              <button className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-500">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Guests get 2 free AI advice runs · sign in for unlimited advice, dashboard &amp; history
        </p>
      </section>

      <section className="grid gap-4 pb-20 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-2xl">{f.icon}</p>
            <h3 className="mt-3 font-semibold text-slate-100">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        Built by{' '}
        <a
          href="https://github.com/codewithsupra"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline"
        >
          Supratim Sarkar
        </a>{' '}
        · React · Redux Toolkit · Clerk · GitHub API · Vercel
      </footer>
    </div>
  )
}
