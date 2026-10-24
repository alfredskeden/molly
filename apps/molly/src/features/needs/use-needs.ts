import type { Timer } from '@molly/api';
import { mood, moodlets, needs, sleepingSpan, wants, type DayRhythm, type DayWindow, type EntriesByKind, type Mood, type Moodlet, type Needs } from '@molly/core';

import { useChildPrefs } from '@/features/children/use-children';
import { useRhythm, useSettings } from '@/features/dashboard/queries';
import type { NeedsLook } from '@/theme/need-look';
import { useTheme } from '@/theme/theme';
import { THEMES } from '@/theme/themes';

/** Everything Life Sim draws from the needs, with the look to draw it in. */
export type NeedsView = {
  look: NeedsLook;
  needs: Needs;
  mood: { mood: Mood; value: number } | null;
  wants: ReturnType<typeof wants>;
  moodlets: Moodlet[];
  /** Playful labels on: level labels, mood words and moodlets are shown. */
  words: boolean;
};

type NeedsSource = {
  entries: EntriesByKind | undefined;
  sleepRunning: Timer | null;
  feedRunning: Timer | null;
  /** The next likely sleep the window row shows (the plan's first unskipped one). */
  next: { start: Date } | null;
  /** The live day or night. */
  window: DayWindow | null;
  /** The child's, for how long a running nap usually lasts. */
  birthDate: string | null;
  /** The child's day rhythm, as the dashboard learned it. */
  day: DayRhythm;
  now: Date;
};

/**
 * The needs layer for the dashboard, or null when the theme has no `needs` slot (then nothing is fetched or
 * computed). Recomputed every render, so it drains with the dashboard's clock; the rhythm comes once per window.
 */
export function useNeeds({ entries, sleepRunning, feedRunning, next, window, birthDate, day, now }: NeedsSource): NeedsView | null {
  const { look, scheme, playful } = useTheme();
  const slot = THEMES[look][scheme].needs;
  const { vitaminDReminder } = useChildPrefs();
  // Until the settings load, the setting is the default one: a window from it would fetch under the wrong key.
  const settled = useSettings().isSuccess;
  const rhythm = useRhythm(window, entries?.sleep, day, slot !== null && settled);
  if (!slot || !entries) return null;
  const input = {
    entries,
    running: {
      // Filling up to the usual morning wake, or the nap's usual length.
      sleep: sleepRunning && sleepingSpan(entries.sleep, sleepRunning, birthDate, day, now),
      feeding: feedRunning !== null,
    },
    next,
    rhythm: rhythm.data ?? { feed: null, diaper: null },
    vitaminD: vitaminDReminder,
  };
  const found = needs(input, now);
  return { look: slot, needs: found, mood: mood(found), wants: wants(found), moodlets: moodlets(input, now), words: playful };
}
