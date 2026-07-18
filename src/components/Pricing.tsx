import { PricingTable } from '@clerk/clerk-react'
import { clerkEnabled } from '../lib/auth'

export function Pricing() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 text-center">
      <div>
        <h2 className="text-2xl font-bold">Pricing</h2>
        <p className="mt-1 text-sm text-slate-400">
          Free forever for casual browsing. Upgrade for unlimited AI merge advice and unlimited
          repo audits.
        </p>
      </div>
      {clerkEnabled ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left">
          <PricingTable />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
          <p className="text-3xl">💳</p>
          <p className="mt-2 text-sm">
            Billing isn&rsquo;t configured on this deployment yet
            (missing <code className="text-slate-400">VITE_CLERK_PUBLISHABLE_KEY</code>).
          </p>
        </div>
      )}
    </div>
  )
}
