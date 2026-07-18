import type { ReactNode } from 'react'
import { SignInButton } from '@clerk/clerk-react'
import { clerkEnabled, useAuth } from '../lib/auth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { signedIn, loaded } = useAuth()

  if (!clerkEnabled) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
        <p className="text-3xl">🔐</p>
        <p className="mt-2 text-sm">
          This is a members-only area. Auth isn&rsquo;t configured on this deployment yet
          (missing <code className="text-slate-400">VITE_CLERK_PUBLISHABLE_KEY</code>).
        </p>
      </div>
    )
  }
  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
  }
  if (!signedIn) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
        <p className="text-3xl">🔐</p>
        <h2 className="mt-3 text-lg font-semibold text-slate-100">Members only</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
          Your dashboard, history, and saved issues live here. Sign in — it&rsquo;s free and takes
          ten seconds.
        </p>
        <SignInButton mode="modal">
          <button className="mt-5 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500">
            Sign in to continue
          </button>
        </SignInButton>
      </div>
    )
  }
  return <>{children}</>
}
