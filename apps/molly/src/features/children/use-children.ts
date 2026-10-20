import type { Child } from '@molly/api';
import { assignHues, childOnScreen, childPrefs, shownChildren, type ChildPrefs } from '@molly/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { useChildren, useSettings } from '@/features/dashboard/queries';
import { useSession, useSignedInSession } from '@/session/session';
import { loadSettings, saveSettings } from '@/storage/settings';
import { DEFAULT_SETTINGS, withChildPrefs } from '@/storage/types';
import { syncWidget } from '@/widget/sync';

export type ChildrenOnScreen = {
  /** Baby Buddy's children, in its order; empty until loaded. */
  all: Child[];
  /** The ones Molly shows (never empty once loaded). */
  shown: Child[];
  /** The child on screen: the session's while it's shown, otherwise the first shown one. */
  current: Child | null;
  prefsOf: (childId: number) => ChildPrefs;
  loaded: boolean;
};

/** Baby Buddy's children with this device's preferences for each. */
export function useChildrenOnScreen(): ChildrenOnScreen {
  const { childId } = useSignedInSession();
  const children = useChildren().data;
  const prefs = (useSettings().data ?? DEFAULT_SETTINGS).children;
  const all = children ?? [];
  const shown = shownChildren(all, prefs);
  return {
    all,
    shown,
    current: childOnScreen(shown, childId),
    prefsOf: (id) => childPrefs(all, prefs, id),
    loaded: children !== undefined,
  };
}

/** The child on screen's nap window, bottle, colour and reminder. */
export function useChildPrefs(): ChildPrefs {
  const { childId } = useSignedInSession();
  return useChildrenOnScreen().prefsOf(childId);
}

/**
 * Saves one child's preferences. Hiding the child on screen moves the screen to the first child still
 * shown, in the same save. The widget and notifications follow.
 */
export function useSetChildPrefs() {
  const queryClient = useQueryClient();
  const { setChild } = useSession();
  const { childId } = useSignedInSession();
  const { all } = useChildrenOnScreen();
  return useCallback(
    async (id: number, changes: Partial<ChildPrefs>) => {
      const next = withChildPrefs(await loadSettings(), id, changes);
      await saveSettings(next);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      const onScreen = childOnScreen(shownChildren(all, next.children), childId);
      if (onScreen && onScreen.id !== childId) await setChild(onScreen.id);
      else syncWidget().catch(() => undefined);
    },
    [queryClient, setChild, childId, all],
  );
}

/**
 * A hidden or deleted child on screen hands over to the first shown one, and a child without a stored colour
 * (new in Baby Buddy, or before any was stored) gets one, so colours stay put when Baby Buddy's list changes.
 */
export function useKeepChildOnScreen() {
  const { childId } = useSignedInSession();
  const { setChild } = useSession();
  const queryClient = useQueryClient();
  const { all, current, loaded } = useChildrenOnScreen();
  const prefs = useSettings().data?.children;
  const fallback = loaded && current && current.id !== childId ? current.id : null;
  const needsHues = loaded && prefs !== undefined && assignHues(all, prefs) !== null;
  useEffect(() => {
    if (fallback !== null) setChild(fallback).catch(() => undefined);
  }, [fallback, setChild]);
  useEffect(() => {
    if (!needsHues) return;
    (async () => {
      const settings = await loadSettings();
      const children = assignHues(all, settings.children);
      if (!children) return;
      await saveSettings({ ...settings, children });
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    })().catch(() => undefined);
  }, [needsHues, all, queryClient]);
}
