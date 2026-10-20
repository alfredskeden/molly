// The dashboard's clock ring (design `Molly Ring v4`, plans/implan-ring-redesign): where a time sits on
// the ring of one day or night window. Pure geometry and words; the app draws what these return.

import { clockText, countdown, counted, durationText, timerText, whenText } from './format';
import { likelySlots, type LikelySlot, type PlanSleep } from './likely-detail';

/** The ring's geometry in its 400 × 400 box, from the design's `renderVals`. Angles are degrees clockwise from 12. */
export const RING = {
  /** Centre. */
  c: 200,
  /** The sleep track's radius and stroke width. */
  trackRadius: 132,
  trackWidth: 30,
  /** A sleep arc's tap target: a stroke this wide along it. */
  hitWidth: 44,
  /** Where feed, diaper and medicine marks sit, outside the track, and their circle's size. */
  markRadius: 178,
  markSize: 34,
  /** Where the plan's time labels sit: just outside the track. */
  labelRadius: 164,
  /** Where the sleeps' clock times sit: just inside the track. */
  sleepLabelRadius: 96,
  /** The cap's centre, above the gap at the top. */
  capY: 29,
  /** The gap at the top: the ring starts here and sweeps `sweep` degrees. */
  start: 16,
  sweep: 328,
} as const;

type Window = { start: Date; end: Date };

/** A time's place on the ring: its fraction of the window over the sweep, clamped to the window. */
export function ringAngle(window: Window, time: Date): number {
  const span = window.end.getTime() - window.start.getTime();
  const share = Math.min(1, Math.max(0, (time.getTime() - window.start.getTime()) / span));
  return RING.start + RING.sweep * share;
}

const RADIANS = Math.PI / 180;

/** The point at `angle` degrees on a circle of `radius` round the ring's centre. */
export function ringPoint(angle: number, radius: number): { x: number; y: number } {
  return { x: RING.c + radius * Math.sin(angle * RADIANS), y: RING.c - radius * Math.cos(angle * RADIANS) };
}

/** The shortest arc drawn: a sleep of a minute still shows. */
const MIN_ARC = 0.5;

/** An SVG path along the circle of `radius`, clockwise from `from` to `to` degrees. */
export function arcPath(from: number, to: number, radius: number): string {
  const end = Math.max(to, from + MIN_ARC);
  const a = ringPoint(from, radius);
  const b = ringPoint(end, radius);
  const large = end - from > 180 ? 1 : 0;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/**
 * A sleep's stroke between its angles on the track. Its round ends stop at the sleep's times, so the drawn
 * sleep covers exactly its time: a mark at the end time sits at its very edge, and sleeps never overlap.
 * A sleep too short for two round ends is square-ended at its times. `width`: the stroke's, in the ring's 400 px box.
 */
export function sleepStroke(from: number, to: number, width: number = RING.trackWidth): { from: number; to: number; cap: 'round' | 'butt' } {
  // How far a round end reaches past the stroke's end on the track, in degrees: half the stroke's width.
  const roundEnd = width / 2 / RING.trackRadius / RADIANS;
  if (to - from < 2 * roundEnd) return { from, to, cap: 'butt' };
  return { from: from + roundEnd, to: to - roundEnd, cap: 'round' };
}

/** The angles of the whole clock hours strictly inside the window, in order. */
export function hourTicks(window: Window): number[] {
  const hour = new Date(window.start);
  hour.setMinutes(0, 0, 0);
  hour.setHours(hour.getHours() + 1);
  const ticks: number[] = [];
  for (; hour < window.end; hour.setHours(hour.getHours() + 1)) ticks.push(ringAngle(window, hour));
  return ticks;
}

/**
 * Where the feed, diaper and medicine marks go: in time order, each at its own time, so its line runs
 * straight in to the track. Marks close in time overlap, the latest on top. Entries outside the window are left out.
 */
export function placeMarks<T extends { at: Date }>(window: Window, items: T[]): (T & { angle: number })[] {
  return items
    .filter((item) => item.at >= window.start && item.at < window.end)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((item) => ({ ...item, angle: ringAngle(window, item.at) }));
}

/** Marks closer than this (degrees) overlap: their circles touch at the mark radius. */
const MARK_OVERLAP = (2 * Math.asin(RING.markSize / 2 / RING.markRadius)) / RADIANS;

/**
 * What a tap on a mark selects. `marks` are in time order, the latest drawn on top. A tap on an overlapping
 * stack holding the selected mark goes to the one under it (older); after the oldest it gives the selected key
 * back, which closes it as a second tap on a lone mark does. Otherwise the mark tapped.
 */
export function markTap<K extends string>(marks: { key: K; angle: number }[], tapped: K, selected: K | null): K {
  const at = marks.find((mark) => mark.key === tapped);
  if (!at || selected === null) return tapped;
  const stack = marks.filter((mark) => Math.abs(mark.angle - at.angle) < MARK_OVERLAP).reverse();
  const index = stack.findIndex((mark) => mark.key === selected);
  if (index === -1) return tapped;
  return stack[index + 1]?.key ?? selected;
}

/** A sleep label's box: this wide a character (the widest theme font at the largest size), this tall. */
const LABEL_CHAR = 8;
const LABEL_HEIGHT = 18;
/** How far a label may move from its time to clear the one before it; further, it's left out. */
const MAX_LABEL_PUSH = 25;

export type SleepLabel<K extends string = string> = { key: K; angle: number; text: string };

function labelsOverlap(a: { angle: number; text: string }, b: { angle: number; text: string }): boolean {
  const [pa, pb] = [ringPoint(a.angle, RING.sleepLabelRadius), ringPoint(b.angle, RING.sleepLabelRadius)];
  return Math.abs(pa.x - pb.x) < ((a.text.length + b.text.length) * LABEL_CHAR) / 2 + 4 && Math.abs(pa.y - pb.y) < LABEL_HEIGHT;
}

/**
 * Each sleep's start and end clock times, inside the track at their places (a running sleep has only its
 * start; times outside the window are left out). A nap too short for two labels gets one, `12:00–12:30`, at
 * its middle; a label crowding the one before it moves on round the ring, or is left out past `MAX_LABEL_PUSH`.
 */
export function sleepLabels<K extends string>(window: Window, sleeps: { key: K; start: Date; end: Date; running: boolean }[]): SleepLabel<K>[] {
  const inside = (time: Date) => time > window.start && time < window.end;
  const wanted = sleeps.flatMap((sleep): SleepLabel<K>[] => {
    const start = inside(sleep.start) ? { key: sleep.key, angle: ringAngle(window, sleep.start), text: clockText(sleep.start) } : null;
    const end = !sleep.running && inside(sleep.end) ? { key: sleep.key, angle: ringAngle(window, sleep.end), text: clockText(sleep.end) } : null;
    if (start && end && labelsOverlap(start, end)) return [{ key: sleep.key, angle: (start.angle + end.angle) / 2, text: `${start.text}–${end.text}` }];
    return [start, end].filter((label): label is SleepLabel<K> => label !== null);
  });
  const placed: SleepLabel<K>[] = [];
  for (const label of wanted.sort((a, b) => a.angle - b.angle)) {
    const before = placed.at(-1);
    let angle = label.angle;
    while (before && labelsOverlap(before, { ...label, angle }) && angle - label.angle <= MAX_LABEL_PUSH) angle += 1;
    if (angle - label.angle <= MAX_LABEL_PUSH && angle <= RING.start + RING.sweep) placed.push({ ...label, angle });
  }
  return placed;
}

export type RingGhost = {
  from: number;
  to: number;
  start: Date;
  end: Date;
  /** The next likely sleep (filled); later ones are fainter. */
  next: boolean;
  /** Which sleep of the day it is (`likelySlots`): what a tap on it opens. */
  slot: LikelySlot;
  /** Just before it, outside the track: how soon a nap opens (`in 1h 16m`, `now`), or bedtime's clock time. */
  labels: { angle: number; text: string }[];
};

/** How far before a ghost its label sits, in degrees. */
const LABEL_OFFSET = 3;

/**
 * The plan's likely sleeps still ahead, as dashed outlines on the track: skipped ones and windows that
 * have ended are left out. Naps are numbered after the `napsSoFar` logged since the morning wake.
 */
export function ringGhosts(window: Window, plan: PlanSleep[], now: Date, napsSoFar = 0): RingGhost[] {
  const slots = likelySlots(plan, napsSoFar);
  return plan
    .flatMap((sleep, index) => {
      const slot = slots[index];
      return slot != null && sleep.end > now ? [{ sleep, slot }] : [];
    })
    .map(({ sleep, slot }, index) => {
      const [from, to] = [ringAngle(window, sleep.start), ringAngle(window, sleep.end)];
      return { from, to, start: sleep.start, end: sleep.end, next: index === 0, slot, labels: [{ angle: from - LABEL_OFFSET, text: soonText(sleep, now) }] };
    });
}

/** Naps say how soon they open (`in 1h 16m`, `now`); bedtime is a time of day worth knowing as one. */
function soonText(sleep: PlanSleep, now: Date): string {
  if (sleep.kind === 'bedtime') return clockText(sleep.start);
  return sleep.start <= now ? 'now' : `in ${countdown(sleep.start.getTime() - now.getTime())}`;
}

export type CentreState =
  | { state: 'awake'; since: Date | null; afterNap: boolean; now: Date }
  | { state: 'sleeping'; since: Date; nap: boolean; now: Date }
  | { state: 'feeding'; since: Date; now: Date }
  | { state: 'past'; kind: 'day' | 'night'; sleptMs: number; naps: number; feeds: number; diapers: number };

/** The three lines in the ring's middle; `tone` colours the first. */
export type CentreText = { label: string; tone: 'muted' | 'sleep' | 'feed'; big: string; sub: string };

/**
 * `Awake 2h 39m since the nap` on the live window; `Sleeping` / `Feeding` with a live timer while one runs;
 * `Slept 3h 14m` with the naps and feeds of a past day, or the feeds and diapers of a past night.
 */
export function centreText(input: CentreState): CentreText {
  switch (input.state) {
    case 'awake':
      return input.since
        ? {
            label: 'Awake',
            tone: 'muted',
            big: durationText(input.now.getTime() - input.since.getTime()),
            sub: input.afterNap ? 'since the nap' : 'since waking up',
          }
        : { label: 'Awake', tone: 'muted', big: '–', sub: 'No sleep logged yet' };
    case 'sleeping':
      return {
        label: 'Sleeping',
        tone: 'sleep',
        big: timerText(input.now.getTime() - input.since.getTime()),
        sub: input.nap ? 'nap so far' : 'night sleep so far',
      };
    case 'feeding':
      return { label: 'Feeding', tone: 'feed', big: timerText(input.now.getTime() - input.since.getTime()), sub: 'so far' };
    case 'past': {
      const counts =
        input.kind === 'day'
          ? [counted(input.naps, 'nap'), counted(input.feeds, 'feed')]
          : [counted(input.feeds, 'feed'), counted(input.diapers, 'diaper')];
      return { label: 'Slept', tone: 'muted', big: durationText(input.sleptMs), sub: counts.join(' · ') };
    }
  }
}

export type WindowRow = {
  /** `Nap 2 likely`, `Bedtime likely`. */
  title: string;
  /** The clock: bedtime's window, `18:30–19:00`, or the time a nap's window opens, `12:45`. */
  range: string;
  /** `in 1h 16m`, `20m left`, `14m ago`. */
  when: string;
  /** `Then nap 3 in 3h 40m · bedtime 18:30`: the rest of the plan, or null. */
  then: string | null;
};

/**
 * The row under the ring on the live day: the next likely sleep that isn't skipped, numbered after the
 * `napsSoFar` naps already logged since the morning wake, and the later ones on the line under it.
 */
export function windowRow(plan: PlanSleep[], napsSoFar: number, now: Date): WindowRow | null {
  const slots = likelySlots(plan, napsSoFar);
  const [next, ...later] = plan.flatMap((sleep, index) => {
    const slot = slots[index];
    return slot == null ? [] : [{ sleep, name: slot === 'bedtime' ? 'bedtime' : `nap ${slot}` }];
  });
  if (!next) return null;
  return {
    title: `${next.name.charAt(0).toUpperCase()}${next.name.slice(1)} likely`,
    range: next.sleep.kind === 'bedtime' ? `${clockText(next.sleep.start)}–${clockText(next.sleep.end)}` : clockText(next.sleep.start),
    when: whenText(next.sleep, now),
    then: later.length > 0 ? `Then ${later.map(({ sleep, name }) => `${name} ${soonText(sleep, now)}`).join(' · ')}` : null,
  };
}

/** Past this, the editor names an entry's window instead of saying how long ago it was. */
const RECENT_MS = 12 * 60 * 60_000;

/**
 * Under the editor's title: `1h 9m · ended 2h 0m ago` for a sleep or feed (`end`), `30m ago` for a diaper or
 * medicine (no `end`), the window's title instead of the "ago" once that's over 12 h, and `40m so far` for
 * a running sleep (`end: null`).
 */
export function editorSubtitle(entry: { start: Date; end?: Date | null }, now: Date, windowTitle: string): string {
  const ago = (time: Date) => now.getTime() - time.getTime();
  if (entry.end === null) return `${durationText(ago(entry.start))} so far`;
  if (entry.end === undefined) return ago(entry.start) < RECENT_MS ? `${durationText(ago(entry.start))} ago` : windowTitle;
  const length = durationText(entry.end.getTime() - entry.start.getTime());
  return `${length} · ${ago(entry.end) < RECENT_MS ? `ended ${durationText(ago(entry.end))} ago` : windowTitle}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Titled = { kind: 'day' | 'night'; start: Date };

/** Whole calendar days from `from`'s date to `to`'s. */
function daysBetween(from: Date, to: Date): number {
  const date = (time: Date) => Date.UTC(time.getFullYear(), time.getMonth(), time.getDate());
  return Math.round((date(to) - date(from)) / 86_400_000);
}

/**
 * `Today`, `Yesterday` or the weekday for a day; `Tonight`, `Last night` or `Tuesday night` for a night.
 * Counted from the live window's calendar day, so the day just ended under a live night is still Today.
 */
export function windowTitle(window: Titled, live: Titled): string {
  const back = daysBetween(window.start, live.start);
  const weekday = WEEKDAYS[window.start.getDay()]!;
  if (window.kind === 'day') return back === 0 ? 'Today' : back === 1 ? 'Yesterday' : weekday;
  if (window.start.getTime() === live.start.getTime()) return 'Tonight';
  return live.kind === 'day' && back === 1 ? 'Last night' : `${weekday} night`;
}

/** The header's date for a window: the day it starts on, `Thu 24 Sep`. */
export function windowDate(window: { start: Date }): string {
  const { start } = window;
  return `${WEEKDAYS[start.getDay()]!.slice(0, 3)} ${start.getDate()} ${MONTHS[start.getMonth()]}`;
}

/** Beside the cap: `Day started 07:13` or `Bedtime 19:05`, or nothing when neither was logged (`clock`). */
export function startLabel(window: { kind: 'day' | 'night'; start: Date; clock: boolean }): string | null {
  if (window.clock) return null;
  return `${window.kind === 'day' ? 'Day started' : 'Bedtime'} ${clockText(window.start)}`;
}
