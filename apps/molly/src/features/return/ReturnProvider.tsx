import { router, usePathname } from 'expo-router';
import { createContext, use, useEffect, useId, useRef, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { useToast } from '@/features/toast/toast';

import { onAppState, START, toastOnReturn, type ReturnAnswer } from './model';
import { takeTrip } from './trip';

/** What the dashboard does on a return: `showLive` (the web) or `goLive` (Android, after a minute away). */
export type OnLive = (answer: Exclude<ReturnAnswer, 'stay'>) => void;

type Registry = {
  live: { current: OnLive | null };
  drafts: Map<string, boolean>;
};

const ReturnContext = createContext<Registry | null>(null);

/**
 * The app coming back to the foreground (`features/return/model.ts` decides). On Android, after a minute
 * away, every screen above the dashboard goes and the dashboard shows now; a draft with changes dropped on
 * the way says "Changes not saved". On the web, every return puts the dashboard on now and nothing else.
 * Only in the signed-in layout: onboarding and "Can't sign in" never see it.
 */
export function ReturnProvider({ children }: { children: ReactNode }) {
  const registry = useRef<Registry>({ live: { current: null }, drafts: new Map() }).current;
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
        trip: status === 'active' && takeTrip(),
      });
      state = next.state;
      if (next.answer === 'stay') return;
      if (toastOnReturn(next.answer, registry.drafts.values())) toast({ text: 'Changes not saved', tone: 'danger' });
      if (next.answer === 'goLive' && router.canDismiss()) router.dismissTo('/');
      registry.live.current?.(next.answer);
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
  const { live } = useRegistry();
  useEffect(() => {
    live.current = onLive;
    return () => {
      if (live.current === onLive) live.current = null;
    };
  }, [live, onLive]);
}

/** A sheet or editor with a draft says whether it has changes, so going live can say "Changes not saved". */
export function useUnsavedOnReturn(changed: boolean) {
  const { drafts } = useRegistry();
  const id = useId();
  useEffect(() => {
    drafts.set(id, changed);
  }, [drafts, id, changed]);
  useEffect(() => () => void drafts.delete(id), [drafts, id]);
}
