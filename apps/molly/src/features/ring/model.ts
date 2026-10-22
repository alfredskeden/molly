import type { Change, Feeding, FeedingMethod, Medication, Sleep, Timer } from '@molly/api';
import { clockText, isSolidFeed, type DayWindow, type EntriesByKind, type LikelySlot, type RingGhost } from '@molly/core';

import { spokenDuration } from '@/lib/time';
import type { FilledSymbol } from '@/theme/symbols';

import { diaperLabel, foodOf, METHOD_LABELS } from '../dashboard/timeline-text';

/** What a tap on the ring selects: a logged entry, the running sleep / feed, or a likely sleep of the plan. */
export type RingKey =
  | `sleep-${number}`
  | `feeding-${number}`
  | `change-${number}`
  | `medication-${number}`
  | 'running-sleep'
  | 'running-feed'
  | LikelyKey;

/** A likely sleep's key: its slot, the nap's number or bedtime. */
export type LikelyKey = `likely-${number}` | 'likely-bedtime';

export const likelyKey = (slot: LikelySlot): LikelyKey => `likely-${slot}`;

/** The slot behind a ring key, or null for a logged or running entry. */
export function likelySlotOf(key: RingKey): LikelySlot | null {
  if (!key.startsWith('likely-')) return null;
  const slot = key.slice('likely-'.length);
  return slot === 'bedtime' ? 'bedtime' : Number(slot);
}

export type RingLikely = RingGhost & { key: LikelyKey; spoken: string };

/** The plan's ghosts with their keys and what a screen reader says: `Nap 3 likely 15:20 to 15:50`. */
export function ringLikely(ghosts: RingGhost[]): RingLikely[] {
  return ghosts.map((ghost) => ({
    ...ghost,
    key: likelyKey(ghost.slot),
    spoken: `${ghost.slot === 'bedtime' ? 'Bedtime' : `Nap ${ghost.slot}`} likely ${clockText(ghost.start)} to ${clockText(ghost.end)}`,
  }));
}

export type RingSleep = { key: RingKey; id: number | null; start: Date; end: Date; running: boolean; spoken: string };

export type MarkKind = 'feed' | 'diaper' | 'med';

export type RingMarkItem = { key: RingKey; kind: MarkKind; at: Date; icon: FilledSymbol; live: boolean; spoken: string };

const FEED_ICONS: Partial<Record<FeedingMethod, FilledSymbol>> = {
  'left breast': 'arrow_back',
  'right breast': 'arrow_forward',
  'both breasts': 'swap_horiz',
  bottle: 'water_full',
};

/** The design's diaper glyphs: Wet a drop, Dirty a face, Both a star. */
export function diaperIcon({ wet, solid }: { wet: boolean; solid: boolean }): FilledSymbol {
  return wet && solid ? 'star' : solid ? 'sentiment_stressed' : 'water_drop';
}

/** A side's arrow, the bottle, a meal's knife and fork. */
export const feedIcon = (method: FeedingMethod): FilledSymbol =>
  isSolidFeed({ method }) ? 'restaurant' : (FEED_ICONS[method] ?? 'breastfeeding');

const overlaps = (window: DayWindow, start: number, end: number) => end > window.start.getTime() && start < window.end.getTime();
const inside = (window: DayWindow, time: number) => time >= window.start.getTime() && time < window.end.getTime();
const took = (start: string, end: string) => spokenDuration(Date.parse(end) - Date.parse(start));

/** The logged sleeps on the window's track, and the running one up to now on the live window. */
export function ringSleeps(window: DayWindow, sleeps: Sleep[], running: Timer | null, now: Date): RingSleep[] {
  const logged = sleeps
    .filter((entry) => overlaps(window, Date.parse(entry.start), Date.parse(entry.end)))
    .map(
      (entry): RingSleep => ({
        key: `sleep-${entry.id}`,
        id: entry.id,
        start: new Date(entry.start),
        end: new Date(entry.end),
        running: false,
        spoken: `${entry.nap ? 'Nap' : 'Night sleep'} ${clockText(new Date(entry.start))} to ${clockText(new Date(entry.end))}, ${took(entry.start, entry.end)}`,
      }),
    );
  if (!running || !overlaps(window, Date.parse(running.start), now.getTime())) return logged;
  const start = new Date(running.start);
  return [
    ...logged,
    {
      key: 'running-sleep',
      id: null,
      start,
      end: now,
      running: true,
      spoken: `Sleeping since ${clockText(start)}, ${spokenDuration(now.getTime() - start.getTime())}. Edit start`,
    },
  ];
}

/** Feeds, diapers and medicine that started in the window, and the running feed on the live window. */
export function ringMarks(window: DayWindow, entries: EntriesByKind, runningFeed: Timer | null): RingMarkItem[] {
  const feeds = entries.feeding
    .filter((entry: Feeding) => inside(window, Date.parse(entry.start)))
    .map(
      (entry): RingMarkItem => ({
        key: `feeding-${entry.id}`,
        kind: 'feed',
        at: new Date(entry.start),
        icon: feedIcon(entry.method),
        live: false,
        spoken: isSolidFeed(entry)
          ? `${METHOD_LABELS[entry.method]} ${clockText(new Date(entry.start))}, ${foodOf(entry)}`
          : [
              `Feed ${clockText(new Date(entry.start))}`,
              METHOD_LABELS[entry.method],
              entry.method === 'bottle' && entry.amount !== null ? `${entry.amount} ml` : took(entry.start, entry.end),
            ].join(', '),
      }),
    );
  const changes = entries.change
    .filter((entry: Change) => inside(window, Date.parse(entry.time)))
    .map(
      (entry): RingMarkItem => ({
        key: `change-${entry.id}`,
        kind: 'diaper',
        at: new Date(entry.time),
        icon: diaperIcon(entry),
        live: false,
        spoken: `Diaper ${clockText(new Date(entry.time))}, ${diaperLabel(entry)}`,
      }),
    );
  const medicines = entries.medication
    .filter((entry: Medication) => inside(window, Date.parse(entry.time)))
    .map(
      (entry): RingMarkItem => ({
        key: `medication-${entry.id}`,
        kind: 'med',
        at: new Date(entry.time),
        icon: 'medication',
        live: false,
        spoken: `${entry.name} ${clockText(new Date(entry.time))}`,
      }),
    );
  const live: RingMarkItem[] =
    runningFeed && inside(window, Date.parse(runningFeed.start))
      ? [
          {
            key: 'running-feed',
            kind: 'feed',
            at: new Date(runningFeed.start),
            icon: 'breastfeeding',
            live: true,
            spoken: `Feeding since ${clockText(new Date(runningFeed.start))}. Stop and save`,
          },
        ]
      : [];
  return [...feeds, ...changes, ...medicines, ...live];
}
