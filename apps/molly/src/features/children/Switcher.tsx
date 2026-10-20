import { childStatus } from '@molly/core';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useRunningTimer } from '@/features/dashboard/queries';
import { useToast } from '@/features/toast/toast';
import { useSession, useSignedInSession } from '@/session/session';

import { ChildrenSheet } from './ChildrenSheet';
import { runningSleepOf, useLastSleeps, useRunningSleeps } from './queries';
import { useChildrenOnScreen } from './use-children';

/** How long "Showing Otto" stays. */
const SWITCH_TOAST_MS = 1800;

/** Puts another child on screen and says so. */
export function useSwitchChild() {
  const { setChild } = useSession();
  const { all, prefsOf } = useChildrenOnScreen();
  const toast = useToast();
  return useCallback(
    (childId: number) => {
      const child = all.find((candidate) => candidate.id === childId);
      if (!child) return;
      setChild(childId).catch(() => undefined);
      toast({
        text: `Showing ${child.first_name}`,
        tone: 'sleep',
        avatar: { name: child.first_name, hue: prefsOf(childId).hue },
        shownMs: SWITCH_TOAST_MS,
      });
    },
    [all, prefsOf, setChild, toast],
  );
}

/** The Children sheet with each shown child's status: its running sleep, or how long since the last one. */
export function ChildrenSheetFor({ now, onClose }: { now: Date; onClose: () => void }) {
  const { childId } = useSignedInSession();
  const { shown, prefsOf } = useChildrenOnScreen();
  const switchChild = useSwitchChild();
  const sleeps = useRunningSleeps().data;
  // The child on screen's own timer is the freshest (it holds a tap's guess).
  const ownSleep = useRunningTimer('sleep').data;
  const lastSleeps = useLastSleeps(
    shown.map((child) => child.id),
    true,
  );
  const rows = shown.map((child) => {
    const running = child.id === childId && ownSleep !== undefined ? ownSleep : runningSleepOf(sleeps, child.id);
    return {
      id: child.id,
      name: child.first_name,
      hue: prefsOf(child.id).hue,
      status: childStatus({ sleepStart: running?.start ?? null, lastSleepEnd: lastSleeps.get(child.id) ?? null }, now),
    };
  });
  return (
    <ChildrenSheet
      rows={rows}
      currentId={childId}
      onPick={switchChild}
      onSettings={() => {
        onClose();
        router.push('/settings');
      }}
      onClose={onClose}
    />
  );
}
