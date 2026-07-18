import { useAuth as useClerkAuth } from '@clerk/clerk-react'

export const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

/**
 * Safe auth state: Clerk hooks throw outside ClerkProvider, so when Clerk
 * isn't configured we report signed-out without touching the hook.
 * clerkEnabled is a build-time constant, so the conditional hook call is
 * stable across renders.
 */
type FeatureCheck = { feature: string } | { plan: string }

export function useAuth(): {
  signedIn: boolean
  loaded: boolean
  isPro: boolean
  has: (params: FeatureCheck) => boolean
} {
  if (!clerkEnabled) {
    return { signedIn: false, loaded: true, isPro: false, has: () => false }
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isSignedIn, isLoaded, has } = useClerkAuth()
  const safeHas = (params: FeatureCheck) => Boolean(has?.(params))
  return {
    signedIn: Boolean(isSignedIn),
    loaded: isLoaded,
    isPro: safeHas({ plan: 'pro_user' }),
    has: safeHas,
  }
}
