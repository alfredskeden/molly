import type { Mood, MoodletKey, NeedKind } from '@molly/core';

import type { FilledSymbol } from '@/theme/symbols';

/** The mood pill's face (design `MOODS`). */
export const MOOD_FACES: Record<Mood, FilledSymbol> = {
  giggly: 'sentiment_very_satisfied',
  content: 'sentiment_satisfied',
  fussy: 'sentiment_dissatisfied',
  wailing: 'sentiment_very_dissatisfied',
  dreaming: 'bedtime',
};

/** Each tracker's glyph, in the Wants bubble and on its moodlets. */
export const NEED_GLYPHS: Record<NeedKind, FilledSymbol> = {
  sleep: 'bedtime',
  feed: 'breastfeeding',
  diaper: 'baby_changing_station',
  medicine: 'medication',
};

export const MOODLET_GLYPHS: Record<MoodletKey, FilledSymbol> = {
  'well-rested': 'bedtime',
  'milk-drunk': 'breastfeeding',
  'fresh-bum': 'baby_changing_station',
  'soothed-gums': 'medication',
  sleepy: 'bedtime',
  hangry: 'breastfeeding',
  soggy: 'baby_changing_station',
  recharging: 'bedtime',
  snug: 'favorite',
};
