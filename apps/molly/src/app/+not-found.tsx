import { Redirect } from 'expo-router';

import { useSession } from '@/session/session';

/**
 * A stale bookmark or a mistyped address: the dashboard, or onboarding when signed out (`/` is behind
 * the signed-in guard, and redirecting there from here goes nowhere).
 */
export default function NotFound() {
  const { state } = useSession();
  return <Redirect href={state.status === 'signedIn' ? '/' : '/onboarding'} />;
}
