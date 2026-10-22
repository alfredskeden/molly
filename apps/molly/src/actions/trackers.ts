import {
  BabyBuddyError,
  type BabyBuddyErrorKind,
  type Change,
  type Client,
  type Feeding,
  type Medication,
  type Sleep,
  type Timer,
  type TimerRef,
} from '@molly/api';
import {
  decideTimerAction,
  diaperFor,
  feedingForStop,
  instantFeedTimes,
  isNightSleep,
  stopFailureOutcome,
  type BottleDefaults,
  type DiaperButton,
  type FeedingStopButton,
  type NapWindow,
} from '@molly/core';

import type { AddDraft } from '@/features/add/add-model';

export type TrackerClient = Pick<
  Client,
  | 'findTimer'
  | 'startTimer'
  | 'stopSleep'
  | 'stopFeeding'
  | 'cancelTimer'
  | 'logChange'
  | 'logMedication'
  | 'logSleep'
  | 'logFeeding'
  | 'updateTimer'
  | 'editEntry'
  | 'getLatestEntry'
>;

export type Tracker = 'sleep' | 'feeding';

export const TIMER_NAMES: Record<Tracker, string> = { sleep: 'molly:sleep', feeding: 'molly:feeding' };

/** What a write created, so the toast can offer to adjust its time. */
export type Created =
  | { kind: 'sleep'; entry: Sleep }
  | { kind: 'feeding'; entry: Feeding }
  | { kind: 'change'; entry: Change }
  | { kind: 'medication'; entry: Medication };

export type Outcome =
  | { type: 'started'; timer: Pick<Timer, 'id' | 'start'> }
  /** `instant`: a feed saved with one tap (`logFeed`), no timer. */
  | { type: 'stopped'; created: Extract<Created, { kind: 'sleep' | 'feeding' }>; instant?: true }
  | { type: 'cancelled' }
  | { type: 'logged'; created: Extract<Created, { kind: 'change' | 'medication' }> }
  | { type: 'alreadyRunning'; since: string; user: number }
  | { type: 'alreadyStopped' }
  | { type: 'permissionNeeded' }
  | { type: 'failed'; error: BabyBuddyErrorKind };

/** `start`: backdated (Add entry with no end); otherwise Baby Buddy starts it now. */
export async function startTimer(
  client: TrackerClient,
  { child, tracker, start: from }: { child: number; tracker: Tracker; start?: Date },
): Promise<Outcome> {
  return reportFailures(async () => {
    const ref = { child, name: TIMER_NAMES[tracker] };
    const running = await client.findTimer(ref);
    const decision = decideTimerAction('start', running);
    if (decision.type === 'alreadyRunning' && running) return { ...decision, user: running.user };
    const { id, start } = await client.startTimer(from ? { ...ref, start: from.toISOString() } : ref);
    return { type: 'started', timer: { id, start } };
  });
}

/**
 * Add entry's Save: a sleep or feed with no end starts its timer from the start, with an end it's saved
 * finished (a bottle with the draft's amount and `bottle`'s type, the last bottle's); a diaper or medicine
 * is saved at its time.
 */
export async function addEntry(
  client: TrackerClient,
  { child, draft, napWindow, bottle }: { child: number; draft: AddDraft; napWindow: NapWindow; bottle: BottleDefaults },
): Promise<Outcome> {
  const [start, end] = [draft.start.toISOString(), draft.end?.toISOString()];
  if ((draft.kind === 'sleep' || draft.kind === 'feed') && !end) {
    return startTimer(client, { child, tracker: draft.kind === 'sleep' ? 'sleep' : 'feeding', start: draft.start });
  }
  return reportFailures(async () => {
    switch (draft.kind) {
      case 'sleep': {
        const nap = !isNightSleep(draft.start, draft.end!, napWindow);
        const entry = await client.logSleep({ child, start, end: end!, nap });
        return { type: 'stopped', created: { kind: 'sleep', entry } };
      }
      case 'feed': {
        const button = FEED_BUTTONS[draft.feed];
        const amount = draft.amount ?? bottle.amount;
        const chosen = { type: bottle.type, ...(amount !== undefined && { amount }) };
        const entry = await client.logFeeding({ child, start, end: end!, ...feedingForStop(button, chosen, draft.food) });
        return { type: 'stopped', created: { kind: 'feeding', entry } };
      }
      case 'diaper': {
        const entry = await client.logChange({ child, time: start, ...diaperFor(DIAPER_BUTTONS[draft.diaper]) });
        return { type: 'logged', created: { kind: 'change', entry } };
      }
      case 'med': {
        const other = draft.med === 'Other';
        const note = draft.note.trim();
        const entry = await client.logMedication({
          child,
          name: other ? note : 'Vitamin D',
          time: start,
          ...(!other && note ? { notes: note } : {}),
        });
        return { type: 'logged', created: { kind: 'medication', entry } };
      }
    }
  });
}

const FEED_BUTTONS = { Left: 'left', Right: 'right', Both: 'both', Bottle: 'bottle', Solids: 'solids' } as const;
const DIAPER_BUTTONS = { Wet: 'wet', Dirty: 'dirty', Both: 'both' } as const;

/** Saved as a nap or night sleep by `isNightSleep`, ending at the stop (`now`; Baby Buddy ends it at its own now). */
export async function stopSleep(
  client: TrackerClient,
  { child, napWindow, now = new Date() }: { child: number; napWindow: NapWindow; now?: Date },
): Promise<Outcome> {
  return consumeRunning(client, { child, name: TIMER_NAMES.sleep }, async (timer) => {
    const nap = !isNightSleep(new Date(timer.start), now, napWindow);
    const entry = await client.stopSleep({ timer: timer.id, nap });
    return { type: 'stopped', created: { kind: 'sleep', entry } };
  });
}

/** `food`: a meal's (Solids), saved as its notes. */
export async function stopFeeding(
  client: TrackerClient,
  { child, button, bottle, food }: { child: number; button: FeedingStopButton; bottle: BottleDefaults; food?: string },
): Promise<Outcome> {
  return consumeRunning(client, { child, name: TIMER_NAMES.feeding }, async (timer) => {
    const entry = await client.stopFeeding({ timer: timer.id, ...feedingForStop(button, bottle, food) });
    return { type: 'stopped', created: { kind: 'feeding', entry } };
  });
}

/**
 * A feed saved with one tap (Time feeds off): finished at once, a minute long and ending now, never
 * starting before the previous feed's end. Reported like a stop, so toasts and widgets treat it the same.
 */
export async function logFeed(
  client: TrackerClient,
  {
    child,
    button,
    bottle,
    food,
    now = new Date(),
  }: { child: number; button: FeedingStopButton; bottle: BottleDefaults; food?: string; now?: Date },
): Promise<Outcome> {
  return reportFailures(async () => {
    const previous = await client.getLatestEntry('feeding', child);
    const { start, end } = instantFeedTimes(now, previous ? new Date(previous.end) : undefined);
    const entry = await client.logFeeding({
      child,
      start: start.toISOString(),
      end: end.toISOString(),
      ...feedingForStop(button, bottle, food),
    });
    return { type: 'stopped', created: { kind: 'feeding', entry }, instant: true };
  });
}

export async function cancelTimer(
  client: TrackerClient,
  { child, tracker }: { child: number; tracker: Tracker },
): Promise<Outcome> {
  return consumeRunning(client, { child, name: TIMER_NAMES[tracker] }, async (timer) => {
    await client.cancelTimer(timer.id);
    return { type: 'cancelled' };
  });
}

export async function logDiaper(
  client: TrackerClient,
  { child, button }: { child: number; button: DiaperButton },
): Promise<Outcome> {
  return reportFailures(async () => {
    // No time: Baby Buddy stamps it and refuses future times, which a fast device clock would send.
    const entry = await client.logChange({ child, ...diaperFor(button) });
    return { type: 'logged', created: { kind: 'change', entry } };
  });
}

export async function logMedication(
  client: TrackerClient,
  { child, name }: { child: number; name: string },
): Promise<Outcome> {
  return reportFailures(async () => {
    // No time, as for diapers.
    const entry = await client.logMedication({ child, name });
    return { type: 'logged', created: { kind: 'medication', entry } };
  });
}

/**
 * What Adjust time changes: a timer's start (after Start), an entry's end (after a stop), a change's
 * or medication's time, or an instant feed's start and end together (`feedingAt`, its length kept).
 */
export type AdjustTarget =
  | { kind: 'timer' | 'sleep' | 'feeding' | 'change' | 'medication'; id: number }
  | { kind: 'feedingAt'; id: number; lengthMs: number };

export type AdjustOutcome =
  | { type: 'adjusted'; time: string }
  | { type: 'failed'; error: BabyBuddyErrorKind; message?: string };

export async function adjustTime(
  client: TrackerClient,
  { target, time }: { target: AdjustTarget; time: Date },
): Promise<AdjustOutcome> {
  const at = time.toISOString();
  try {
    if (target.kind === 'timer') return adjusted((await client.updateTimer(target.id, { start: at })).start);
    if (target.kind === 'feedingAt') {
      const start = new Date(time.getTime() - target.lengthMs).toISOString();
      return adjusted((await client.editEntry('feeding', target.id, { start, end: at })).end);
    }
    if (target.kind === 'change' || target.kind === 'medication')
      return adjusted((await client.editEntry(target.kind, target.id, { time: at })).time);
    return adjusted((await client.editEntry(target.kind, target.id, { end: at })).end);
  } catch (error) {
    if (!(error instanceof BabyBuddyError)) throw error;
    // Baby Buddy's own words (a future time, an overlap) say more than any summary of ours.
    return error.fields
      ? { type: 'failed', error: error.kind, message: Object.values(error.fields).flat().join(' ') }
      : { type: 'failed', error: error.kind };
  }
}

const adjusted = (time: string): AdjustOutcome => ({ type: 'adjusted', time });

/**
 * Looks the timer up first and writes only if it still runs. The other parent may still stop it
 * between the lookup and the write, so a gone or forbidden write maps to an outcome, not an error.
 */
async function consumeRunning(
  client: TrackerClient,
  ref: TimerRef,
  write: (timer: Timer) => Promise<Outcome>,
): Promise<Outcome> {
  return reportFailures(async () => {
    const running = await client.findTimer(ref);
    if (!running) return { type: 'alreadyStopped' };
    try {
      return await write(running);
    } catch (error) {
      if (error instanceof BabyBuddyError) return stopFailureOutcome(error.kind);
      throw error;
    }
  });
}

async function reportFailures(action: () => Promise<Outcome>): Promise<Outcome> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof BabyBuddyError) return { type: 'failed', error: error.kind };
    throw error;
  }
}
