import { router, usePathname } from 'expo-router';
import { createContext, use, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AppState, Keyboard, Platform } from 'react-native';

import { useToast } from '@/features/toast/toast';

import { onAppState, START, toastOnReturn, type ReturnAnswer } from './model';
import { tripOnAppState } from './trip';

/** What the dashboard does on a return: `showLive` (the web) or `goLive` (Android, after a minute away). */
export type OnLive = (answer: Exclude<ReturnAnswer, 'stay'>) => void;

/** Who listens for a return: the dashboard's way back to now, and each open draft's "has changes". */
function newRegistry() {
  let live: OnLive | null = null;
  const drafts = new Map<string, boolean>();
  return {
    live: (answer: Exclude<ReturnAnswer, 'stay'>) => live?.(answer),
    setLive: (onLive: OnLive) => {
      live = onLive;
      return () => {
        if (live === onLive) live = null;
      };
    },
    drafts: () => drafts.values(),
    setDraft: (id: string, changed: boolean) => void drafts.set(id, changed),
    dropDraft: (id: string) => void drafts.delete(id),
  };
}

type Registry = ReturnType<typeof newRegistry>;

const ReturnContext = createContext<Registry | null>(null);

/**
 * The app coming back to the foreground (`features/return/model.ts` decides). On Android, after a minute
 * away, every screen above the dashboard goes and the dashboard shows now; a draft with changes dropped on
 * the way says "Changes not saved". On the web, every return puts the dashboard on now and nothing else.
 * Only in the signed-in layout: onboarding and "Can't sign in" never see it.
 */
export function ReturnProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(newRegistry);
  const toast = useToast();
  const pathname = usePathname();
  const tapLog = useRef(false);
  useEffect(() => {
    tapLog.current = pathname === '/tap-log';
  }, [pathname]);

  useEffect(() => {
    let state = START;
    const subscription = AppState.addEventListener('change', (status) => {
      const platform = Platform.OS === 'web' ? 'web' : 'android';
      const next = onAppState(state, status, Date.now(), {
        platform,
        tapLog: tapLog.current,
        trip: tripOnAppState(status),
      });
      state = next.state;
      if (next.answer === 'stay') return;
      if (toastOnReturn(next.answer, registry.drafts())) toast({ text: 'Changes not saved', tone: 'danger' });
      if (next.answer === 'goLive') {
        // A sheet's text field unmounted while focused can leave Android's keyboard up over the dashboard.
        Keyboard.dismiss();
        if (router.canDismiss()) router.dismissTo('/');
      }
      registry.live(next.answer);
    });
    return () => subscription.remove();
  }, [registry, toast]);

  return <ReturnContext value={registry}>{children}</ReturnContext>;
}

function useRegistry() {
  const registry = use(ReturnContext);
  if (!registry) throw new Error('Must be used inside ReturnProvider');
  return registry;
}

/** The dashboard's way back to now, called on a return. */
export function useOnLive(onLive: OnLive) {
  const { setLive } = useRegistry();
  useEffect(() => setLive(onLive), [setLive, onLive]);
}

/** A sheet or editor with a draft says whether it has changes, so going live can say "Changes not saved". */
export function useUnsavedOnReturn(changed: boolean) {
  const { setDraft, dropDraft } = useRegistry();
  const id = useId();
  useEffect(() => setDraft(id, changed), [setDraft, id, changed]);
  useEffect(() => () => dropDraft(id), [dropDraft, id]);
}
