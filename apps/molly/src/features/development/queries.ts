import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useClient, useSettings } from '@/features/dashboard/queries';
import { updateSettings } from '@/storage/settings';
import { DEFAULT_SETTINGS, type Settings } from '@/storage/types';

/**
 * The child's own numbers need the last 7 full days, and a night ending in the first of them; the child's
 * rhythm, which splits naps from nights, is learned from the 14 days before today.
 */
const SLEEP_DAYS = 15;

/**
 * The guide's child's sleeps (the Sleep topic's last 7 days) and recent medication (Vitamin D today), for any
 * child, not only the one on screen. Read when a topic opens; not polled.
 */
export function useGuideEntries(childId: number) {
  const client = useClient();
  return useQuery({
    queryKey: ['guide-entries', childId],
    queryFn: async ({ signal }) => {
      const now = new Date();
      const day = (back: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back).toISOString();
      const [sleep, medication] = await Promise.all([
        client.listEntries('sleep', { child: childId, end_min: day(SLEEP_DAYS) }, { signal }),
        client.listEntries('medication', { child: childId, date_min: day(2) }, { signal }),
      ]);
      return { sleep, medication };
    },
    staleTime: 60_000,
  });
}

/** The guide's device settings (region, first-open note) and a way to change them. */
export function useGuideSettings() {
  const stored = useSettings().data;
  const settings = stored ?? DEFAULT_SETTINGS;
  const queryClient = useQueryClient();
  const change = useCallback(
    async (changes: Partial<Pick<Settings, 'guideRegion' | 'guideNoteSeen'>>) => {
      await updateSettings(changes);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    [queryClient],
  );
  return { region: settings.guideRegion, noteSeen: settings.guideNoteSeen, loaded: stored !== undefined, change };
}
