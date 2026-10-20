import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { clearCredentials, loadCredentials, saveCredentials } from '@/storage/credentials';
import { loadSettings, saveSettings } from '@/storage/settings';
import { settingsAfterSignIn, settingsAfterSignOut, type Credentials } from '@/storage/types';

export type Session = { credentials: Credentials; childId: number };

/**
 * `keyRejected`: Baby Buddy refuses this phone's key. The session (address, user, child) is kept, and
 * only a new key is asked for; the entries are safe in Baby Buddy.
 */
type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session }
  | { status: 'keyRejected'; session: Session };

type SessionContextValue = {
  state: SessionState;
  /** `hidden`: the children left unticked in onboarding; left out, every child's preferences stay. */
  signIn: (session: Session, hidden?: number[]) => Promise<void>;
  signOut: () => Promise<void>;
  rejectKey: () => void;
  setChild: (childId: number) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    Promise.all([loadCredentials(), loadSettings()])
      .then(([credentials, settings]) => {
        setState(
          credentials && settings.childId !== null
            ? { status: 'signedIn', session: { credentials, childId: settings.childId } }
            : { status: 'signedOut' },
        );
      })
      // Storage that can't be read (SecureStore after a keystore reset or backup restore, `localStorage`
      // in a private window): signed out, rather than the splash forever.
      .catch(() => setState({ status: 'signedOut' }));
  }, []);

  async function signIn(session: Session, hidden?: number[]) {
    await saveCredentials(session.credentials);
    await saveSettings(settingsAfterSignIn(await loadSettings(), { childId: session.childId, hidden }));
    setState({ status: 'signedIn', session });
  }

  async function signOut() {
    await clearCredentials();
    await saveSettings(settingsAfterSignOut(await loadSettings()));
    setState({ status: 'signedOut' });
  }

  const rejectKey = useCallback(() => {
    setState((current) => (current.status === 'signedIn' ? { status: 'keyRejected', session: current.session } : current));
  }, []);

  /** The child on screen. Every query is keyed by child, so the screens switch with it. */
  const setChild = useCallback(async (childId: number) => {
    await saveSettings({ ...(await loadSettings()), childId });
    setState((current) =>
      current.status === 'signedIn' ? { status: 'signedIn', session: { ...current.session, childId } } : current,
    );
  }, []);

  return <SessionContext value={{ state, signIn, signOut, rejectKey, setChild }}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** Also while the key is rejected: screens leaving the dashboard may still render once. */
export function useSignedInSession(): Session {
  const { state } = useSession();
  if (state.status !== 'signedIn' && state.status !== 'keyRejected') throw new Error('useSignedInSession used while signed out');
  return state.session;
}
