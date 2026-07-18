import { Link, NavLink } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { clerkEnabled, useAuth } from '../lib/auth'

const TABS = [
  { to: '/app', label: 'Find', end: true },
  { to: '/app/dashboard', label: 'Dashboard', end: false },
  { to: '/app/history', label: 'History', end: false },
  { to: '/pricing', label: 'Pricing', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export function Header() {
  const { isPro } = useAuth()

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <span className="text-lg font-semibold text-slate-100">OSS Finder</span>
          {isPro && (
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              PRO
            </span>
          )}
        </Link>
        <nav className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1 text-sm transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        {clerkEnabled ? (
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        ) : (
          <span className="w-8" aria-hidden="true" />
        )}
      </div>
    </header>
  )
}
