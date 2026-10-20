// Life Sim's own words (the design "Molly Sim App", its NEED and MOODS tables): the need levels, mood
// names, moodlets and the toast's leads. No other theme has them, so they sit on Life Sim's `needs` slot,
// not in `Copy`; shown only with Playful labels on. Plain data, no React. Drafted where the design has none
// (the toast leads, `Wants`); wording not yet reviewed.

import type { Mood, MoodletKey, NeedKind } from '@molly/core';

export type SimWords = {
  /** A need's words from full to empty (`NeedLevel` 0–3). */
  levels: Record<NeedKind, [string, string, string, string]>;
  /** A running sleep's or feed's tile, in place of its level. */
  running: string;
  moods: Record<Mood, string>;
  moodlets: Record<MoodletKey, string>;
  /** The ring's centre once the sleep need is empty. */
  pastNap: string;
  /** Under the wanted tracker's icon in the ring's corner. */
  wants: string;
  /** Before a saved entry's toast ("Fresh bum! Diaper saved 12:10"). */
  toastLeads: Record<NeedKind, string>;
};

export const SIM_WORDS: SimWords = {
  levels: {
    sleep: ['Bright-eyed', 'Yawning', 'Rubbing eyes', 'Overtired chaos'],
    feed: ['Milk drunk', 'Snacky', 'Rooting around', 'HANGRY'],
    diaper: ['Fresh bum', 'Probably fine', 'Suspicious smell', 'Code brown'],
    medicine: ['Teeth? What teeth', 'A bit gnawy', 'Drool fountain', 'Teething rage'],
  },
  running: 'Recharging…',
  moods: { giggly: 'Giggly', content: 'Content', fussy: 'Fussy', wailing: 'Wailing', dreaming: 'Dreaming' },
  moodlets: {
    'well-rested': 'Well rested',
    'milk-drunk': 'Milk drunk',
    'fresh-bum': 'Fresh bum',
    'soothed-gums': 'Soothed gums',
    sleepy: 'Sleepy',
    hangry: 'Hangry',
    soggy: 'Soggy',
    recharging: 'Recharging',
    snug: 'Snug as a bug',
  },
  pastNap: 'Way past nap time',
  wants: 'Wants',
  toastLeads: { sleep: 'Bright-eyed!', feed: 'Milk drunk!', diaper: 'Fresh bum!', medicine: 'Soothed gums!' },
};
