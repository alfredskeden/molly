import { BabyBuddyError } from '@molly/api';
import { describe, expect, it, vi } from 'vitest';

import {
  CHILD,
  fakeClient,
  runningSleep,
  savedChange,
  savedFeeding,
  savedMedication,
  savedSleep,
} from '@/test/fake-client';

import {
  addEntry,
  adjustTime,
  cancelTimer,
  logDiaper,
  logFeed,
  logMedication,
  startTimer,
  stopFeeding,
  stopSleep,
  type TrackerClient,
} from './trackers';

const napWindow = { start: '07:00', end: '19:00' };

describe('starting a timer', () => {
  it('with none running creates a molly timer and reports it', async () => {
    // Given
    const client = fakeClient();

    // When
    const outcome = await startTimer(client, { child: CHILD, tracker: 'sleep' });

    // Then
    expect(outcome).toEqual({ type: 'started', timer: { id: runningSleep.id, start: runningSleep.start } });
    expect(client.startTimer).toHaveBeenCalledWith({ child: CHILD, name: 'molly:sleep' });
  });

  it('with one running creates nothing and reports since when it runs and who started it', async () => {
    // Given
    const client = fakeClient({ findTimer: vi.fn(async () => runningSleep) });

    // When
    const outcome = await startTimer(client, { child: CHILD, tracker: 'sleep' });

    // Then
    expect(outcome).toEqual({ type: 'alreadyRunning', since: runningSleep.start, user: runningSleep.user });
    expect(client.startTimer).not.toHaveBeenCalled();
  });

  it('when Baby Buddy cannot be reached creates nothing and reports the failure', async () => {
    // Given
    const client = fakeClient({ findTimer: vi.fn(async () => Promise.reject(new BabyBuddyError('unreachable'))) });

    // When
    const outcome = await startTimer(client, { child: CHILD, tracker: 'sleep' });

    // Then
    expect(outcome).toEqual({ type: 'failed', error: 'unreachable' });
    expect(client.startTimer).not.toHaveBeenCalled();
  });
});

describe('stopping sleep', () => {
  it('with a timer running consumes it with the nap flag from the window and reports the sleep', async () => {
    // Given
    const client = fakeClient({ findTimer: vi.fn(async () => runningSleep), stopSleep: vi.fn(async () => savedSleep) });

    // When
    const outcome = await stopSleep(client, { child: CHILD, napWindow, now: new Date(savedSleep.end) });

    // Then
    expect(outcome).toEqual({ type: 'stopped', created: { kind: 'sleep', entry: savedSleep } });
    expect(client.stopSleep).toHaveBeenCalledWith({ timer: runningSleep.id, nap: true });
  });

  it.each([
    ['a night sleep once it ran past the window end', [18, 45], [19, 10], false],
    ['a nap when it ended before the window end', [18, 0], [18, 40], true],
    ['a night sleep when it started after the window end', [19, 30], [20, 0], false],
  ])('saves %s', async (_case, from, to, nap) => {
    // Given
    const timer = { ...runningSleep, start: new Date(2026, 8, 20, from[0]!, from[1]).toISOString() };
    const client = fakeClient({ findTimer: vi.fn(async () => timer), stopSleep: vi.fn(async () => savedSleep) });

    // When
    await stopSleep(client, { child: CHILD, napWindow, now: new Date(2026, 8, 20, to[0]!, to[1]) });

    // Then
    expect(client.stopSleep).toHaveBeenCalledWith({ timer: runningSleep.id, nap });
  });

  it('with no timer running writes nothing and reports already stopped', async () => {
    // Given
    const client = fakeClient();

    // When
    const outcome = await stopSleep(client, { child: CHILD, napWindow });

    // Then
    expect(outcome).toEqual({ type: 'alreadyStopped' });
    expect(client.stopSleep).not.toHaveBeenCalled();
  });

  it('when the timer is gone by the time of the stop reports already stopped', async () => {
    // Given
    const client = fakeClient({
      findTimer: vi.fn(async () => runningSleep),
      stopSleep: vi.fn(async () => Promise.reject(new BabyBuddyError('notFound'))),
    });

    // When
    const outcome = await stopSleep(client, { child: CHILD, napWindow });

    // Then
    expect(outcome).toEqual({ type: 'alreadyStopped' });
  });

  it('when the timer belongs to someone else without permission reports permission needed', async () => {
    // Given
    const client = fakeClient({
      findTimer: vi.fn(async () => runningSleep),
      stopSleep: vi.fn(async () => Promise.reject(new BabyBuddyError('forbidden'))),
    });

    // When
    const outcome = await stopSleep(client, { child: CHILD, napWindow });

    // Then
    expect(outcome).toEqual({ type: 'permissionNeeded' });
  });
});

describe('stopping a feeding', () => {
  it('with the bottle button consumes the timer with the bottle defaults and reports the feeding', async () => {
    // Given
    const runningFeeding = { ...runningSleep, id: 8, name: 'molly:feeding' };
    const client = fakeClient({
      findTimer: vi.fn(async () => runningFeeding),
      stopFeeding: vi.fn(async () => savedFeeding),
    });

    // When
    const outcome = await stopFeeding(client, {
      child: CHILD,
      button: 'bottle',
      bottle: { type: 'formula', amount: 120 },
    });

    // Then
    expect(outcome).toEqual({ type: 'stopped', created: { kind: 'feeding', entry: savedFeeding } });
    expect(client.findTimer).toHaveBeenCalledWith({ child: CHILD, name: 'molly:feeding' });
    expect(client.stopFeeding).toHaveBeenCalledWith({ timer: 8, type: 'formula', method: 'bottle', amount: 120 });
  });
});

describe('cancelling a timer', () => {
  it('with a timer running deletes it and reports cancelled', async () => {
    // Given
    const client = fakeClient({ findTimer: vi.fn(async () => runningSleep) });

    // When
    const outcome = await cancelTimer(client, { child: CHILD, tracker: 'sleep' });

    // Then
    expect(outcome).toEqual({ type: 'cancelled' });
    expect(client.cancelTimer).toHaveBeenCalledWith(runningSleep.id);
  });

  it('with no timer running reports already stopped', async () => {
    // Given
    const client = fakeClient();

    // When
    const outcome = await cancelTimer(client, { child: CHILD, tracker: 'sleep' });

    // Then
    expect(outcome).toEqual({ type: 'alreadyStopped' });
    expect(client.cancelTimer).not.toHaveBeenCalled();
  });
});

describe('cancelling a timer that changed meanwhile', () => {
  it.each([
    ['forbidden', 'permissionNeeded'],
    ['notFound', 'alreadyStopped'],
  ] as const)('a %s delete reports %s', async (error, expected) => {
    // Given
    const client = fakeClient({
      findTimer: vi.fn(async () => runningSleep),
      cancelTimer: vi.fn(async () => Promise.reject(new BabyBuddyError(error))),
    });

    // When
    const outcome = await cancelTimer(client, { child: CHILD, tracker: 'sleep' });

    // Then
    expect(outcome).toEqual({ type: expected });
  });
});

describe('logging a diaper change', () => {
  it("logs the button as wet and solid flags, leaves the time to Baby Buddy's clock and reports the change", async () => {
    // Given
    const client = fakeClient({ logChange: vi.fn(async () => savedChange) });

    // When
    const outcome = await logDiaper(client, { child: CHILD, button: 'both' });

    // Then
    expect(outcome).toEqual({ type: 'logged', created: { kind: 'change', entry: savedChange } });
    expect(client.logChange).toHaveBeenCalledWith({ child: CHILD, wet: true, solid: true });
  });

  it('when Baby Buddy cannot be reached reports the failure', async () => {
    // Given
    const client = fakeClient({ logChange: vi.fn(async () => Promise.reject(new BabyBuddyError('unreachable'))) });

    // When
    const outcome = await logDiaper(client, { child: CHILD, button: 'wet' });

    // Then
    expect(outcome).toEqual({ type: 'failed', error: 'unreachable' });
  });
});

describe('logging a medication', () => {
  it("logs the name, leaves the time to Baby Buddy's clock and reports the medication", async () => {
    // Given
    const client = fakeClient({ logMedication: vi.fn(async () => savedMedication) });

    // When
    const outcome = await logMedication(client, { child: CHILD, name: 'Vitamin D' });

    // Then
    expect(outcome).toEqual({ type: 'logged', created: { kind: 'medication', entry: savedMedication } });
    expect(client.logMedication).toHaveBeenCalledWith({ child: CHILD, name: 'Vitamin D' });
  });

  it('when Baby Buddy cannot be reached reports the failure', async () => {
    // Given
    const client = fakeClient({ logMedication: vi.fn(async () => Promise.reject(new BabyBuddyError('unreachable'))) });

    // When
    const outcome = await logMedication(client, { child: CHILD, name: 'Vitamin D' });

    // Then
    expect(outcome).toEqual({ type: 'failed', error: 'unreachable' });
  });
});

describe('logging an instant feed', () => {
  const now = new Date('2026-09-20T14:30:00Z');

  it('saves a breastfeed from its side, ending now and a minute long, and reports it like a stop', async () => {
    // Given
    const client = fakeClient({ logFeeding: vi.fn(async () => savedFeeding) });

    // When
    const outcome = await logFeed(client, { child: CHILD, button: 'left', bottle: { type: 'formula', amount: 120 }, now });

    // Then
    expect(outcome).toEqual({ type: 'stopped', created: { kind: 'feeding', entry: savedFeeding }, instant: true });
    expect(client.logFeeding).toHaveBeenCalledWith({
      child: CHILD,
      start: '2026-09-20T14:29:00.000Z',
      end: '2026-09-20T14:30:00.000Z',
      type: 'breast milk',
      method: 'left breast',
    });
  });

  it('saves a bottle with the chosen type and amount', async () => {
    // Given
    const client = fakeClient({ logFeeding: vi.fn(async () => savedFeeding) });

    // When
    await logFeed(client, { child: CHILD, button: 'bottle', bottle: { type: 'breast milk', amount: 135 }, now });

    // Then
    expect(client.logFeeding).toHaveBeenCalledWith(expect.objectContaining({ type: 'breast milk', method: 'bottle', amount: 135 }));
  });

  it("starts at the previous feed's end when that was under a minute ago", async () => {
    // Given
    const previous = { ...savedFeeding, end: '2026-09-20T14:29:40Z' };
    const client = fakeClient({
      getLatestEntry: vi.fn(async () => previous) as TrackerClient['getLatestEntry'],
      logFeeding: vi.fn(async () => savedFeeding),
    });

    // When
    await logFeed(client, { child: CHILD, button: 'right', bottle: { type: 'formula', amount: 120 }, now });

    // Then
    expect(client.getLatestEntry).toHaveBeenCalledWith('feeding', CHILD);
    expect(client.logFeeding).toHaveBeenCalledWith(expect.objectContaining({ start: '2026-09-20T14:29:40.000Z', end: '2026-09-20T14:30:00.000Z' }));
  });

  it.each(['unreachable', 'forbidden', 'validation'] as const)('reports a %s failure and saves nothing', async (kind) => {
    // Given
    const client = fakeClient({ logFeeding: vi.fn(async () => Promise.reject(new BabyBuddyError(kind))) });

    // When
    const outcome = await logFeed(client, { child: CHILD, button: 'both', bottle: { type: 'formula', amount: 120 }, now });

    // Then
    expect(outcome).toEqual({ type: 'failed', error: kind });
  });

  it('reports a failed lookup of the previous feed and saves nothing', async () => {
    // Given
    const client = fakeClient({
      getLatestEntry: vi.fn(async () => Promise.reject(new BabyBuddyError('unreachable'))) as TrackerClient['getLatestEntry'],
    });

    // When
    const outcome = await logFeed(client, { child: CHILD, button: 'left', bottle: { type: 'formula', amount: 120 }, now });

    // Then
    expect(outcome).toEqual({ type: 'failed', error: 'unreachable' });
    expect(client.logFeeding).not.toHaveBeenCalled();
  });
});

describe('adjusting the time of what was just logged', () => {
  const earlier = new Date('2026-09-20T12:05:00Z');

  it("moves a started timer's start", async () => {
    // Given
    const client = fakeClient({ updateTimer: vi.fn(async () => ({ ...runningSleep, start: earlier.toISOString() })) });

    // When
    const outcome = await adjustTime(client, { target: { kind: 'timer', id: runningSleep.id }, time: earlier });

    // Then
    expect(outcome).toEqual({ type: 'adjusted', time: earlier.toISOString() });
    expect(client.updateTimer).toHaveBeenCalledWith(runningSleep.id, { start: earlier.toISOString() });
  });

  it.each(['sleep', 'feeding'] as const)("moves a stopped %s's end", async (kind) => {
    // Given
    const saved = { ...savedFeeding, end: earlier.toISOString() };
    const client = fakeClient({ editEntry: vi.fn(async () => saved) as TrackerClient['editEntry'] });

    // When
    const outcome = await adjustTime(client, { target: { kind, id: 32 }, time: earlier });

    // Then
    expect(outcome).toEqual({ type: 'adjusted', time: earlier.toISOString() });
    expect(client.editEntry).toHaveBeenCalledWith(kind, 32, { end: earlier.toISOString() });
  });

  it("moves an instant feed's start and end together, keeping its length", async () => {
    // Given
    const saved = { ...savedFeeding, start: '2026-09-20T12:04:00.000Z', end: earlier.toISOString() };
    const client = fakeClient({ editEntry: vi.fn(async () => saved) as TrackerClient['editEntry'] });

    // When
    const outcome = await adjustTime(client, { target: { kind: 'feedingAt', id: 32, lengthMs: 60_000 }, time: earlier });

    // Then
    expect(outcome).toEqual({ type: 'adjusted', time: earlier.toISOString() });
    expect(client.editEntry).toHaveBeenCalledWith('feeding', 32, { start: '2026-09-20T12:04:00.000Z', end: earlier.toISOString() });
  });

  it("moves a logged diaper change's time", async () => {
    // Given
    const saved = { ...savedChange, time: earlier.toISOString() };
    const client = fakeClient({ editEntry: vi.fn(async () => saved) as TrackerClient['editEntry'] });

    // When
    const outcome = await adjustTime(client, { target: { kind: 'change', id: savedChange.id }, time: earlier });

    // Then
    expect(outcome).toEqual({ type: 'adjusted', time: earlier.toISOString() });
    expect(client.editEntry).toHaveBeenCalledWith('change', savedChange.id, { time: earlier.toISOString() });
  });

  it("moves a logged medication's time", async () => {
    // Given
    const saved = { ...savedMedication, time: earlier.toISOString() };
    const client = fakeClient({ editEntry: vi.fn(async () => saved) as TrackerClient['editEntry'] });

    // When
    const outcome = await adjustTime(client, { target: { kind: 'medication', id: savedMedication.id }, time: earlier });

    // Then
    expect(outcome).toEqual({ type: 'adjusted', time: earlier.toISOString() });
    expect(client.editEntry).toHaveBeenCalledWith('medication', savedMedication.id, { time: earlier.toISOString() });
  });

  it("reports a time Baby Buddy refuses with Baby Buddy's reason", async () => {
    // Given
    const refused = new BabyBuddyError('validation', { fields: { start: ['Date/time can not be in the future.'] } });
    const client = fakeClient({ updateTimer: vi.fn(async () => Promise.reject(refused)) });

    // When
    const outcome = await adjustTime(client, { target: { kind: 'timer', id: runningSleep.id }, time: earlier });

    // Then
    expect(outcome).toEqual({ type: 'failed', error: 'validation', message: 'Date/time can not be in the future.' });
  });

  it('reports an unreachable Baby Buddy as a failure', async () => {
    // Given
    const client = fakeClient({ updateTimer: vi.fn(async () => Promise.reject(new BabyBuddyError('unreachable'))) });

    // When
    const outcome = await adjustTime(client, { target: { kind: 'timer', id: runningSleep.id }, time: earlier });

    // Then
    expect(outcome).toEqual({ type: 'failed', error: 'unreachable' });
  });
});

describe('adding an entry from the Add entry sheet', () => {
  const start = new Date('2026-09-20T10:50:00Z');
  const end = new Date('2026-09-20T11:20:00Z');
  const bottle = { type: 'formula' as const, amount: 120 };
  const base = { feed: 'Left' as const, diaper: 'Wet' as const, med: 'Vitamin D' as const, note: '', amount: null };

  it('starts a timer backdated to the start when a sleep has no end', async () => {
    // Given
    const client = fakeClient();

    // When
    const outcome = await addEntry(client, { child: CHILD, napWindow, bottle, draft: { ...base, kind: 'sleep', start, end: null } });

    // Then
    expect(client.startTimer).toHaveBeenCalledWith({ child: CHILD, name: 'molly:sleep', start: start.toISOString() });
    expect(outcome).toMatchObject({ type: 'started' });
  });

  it('starts nothing when that timer already runs', async () => {
    // Given
    const client = fakeClient({ findTimer: vi.fn(async () => runningSleep) });

    // When
    const outcome = await addEntry(client, { child: CHILD, napWindow, bottle, draft: { ...base, kind: 'sleep', start, end: null } });

    // Then
    expect(outcome).toMatchObject({ type: 'alreadyRunning' });
    expect(client.startTimer).not.toHaveBeenCalled();
  });

  it('saves a finished sleep as a nap or night sleep by the nap window', async () => {
    // Given
    const client = fakeClient({ logSleep: vi.fn(async () => savedSleep) });

    // When
    const outcome = await addEntry(client, { child: CHILD, napWindow: { start: '00:00', end: '23:59' }, bottle, draft: { ...base, kind: 'sleep', start, end } });

    // Then
    expect(client.logSleep).toHaveBeenCalledWith({ child: CHILD, start: start.toISOString(), end: end.toISOString(), nap: true });
    expect(outcome).toEqual({ type: 'stopped', created: { kind: 'sleep', entry: savedSleep } });
  });

  it('saves a finished sleep that ran past the nap-window end as night sleep', async () => {
    // Given
    const client = fakeClient({ logSleep: vi.fn(async () => savedSleep) });
    const [from, to] = [new Date(2026, 8, 20, 18, 45), new Date(2026, 8, 21, 2, 0)];

    // When
    await addEntry(client, { child: CHILD, napWindow, bottle, draft: { ...base, kind: 'sleep', start: from, end: to } });

    // Then
    expect(client.logSleep).toHaveBeenCalledWith({ child: CHILD, start: from.toISOString(), end: to.toISOString(), nap: false });
  });

  it("saves a finished bottle feed with the amount chosen and the last bottle's type", async () => {
    // Given
    const client = fakeClient({ logFeeding: vi.fn(async () => savedFeeding) });

    // When
    await addEntry(client, { child: CHILD, napWindow, bottle, draft: { ...base, kind: 'feed', feed: 'Bottle', start, end, amount: 135 } });

    // Then
    expect(client.logFeeding).toHaveBeenCalledWith({
      child: CHILD,
      start: start.toISOString(),
      end: end.toISOString(),
      type: 'formula',
      method: 'bottle',
      amount: 135,
    });
  });

  it('saves a diaper at its time', async () => {
    // Given
    const client = fakeClient({ logChange: vi.fn(async () => savedChange) });

    // When
    await addEntry(client, { child: CHILD, napWindow, bottle, draft: { ...base, kind: 'diaper', diaper: 'Both', start, end: null } });

    // Then
    expect(client.logChange).toHaveBeenCalledWith({ child: CHILD, time: start.toISOString(), wet: true, solid: true });
  });

  it('saves Vitamin D with its note, and another medicine by the name written', async () => {
    // Given
    const client = fakeClient({ logMedication: vi.fn(async () => savedMedication) });

    // When
    await addEntry(client, { child: CHILD, napWindow, bottle, draft: { ...base, kind: 'med', note: 'with the feed', start, end: null } });
    await addEntry(client, { child: CHILD, napWindow, bottle, draft: { ...base, kind: 'med', med: 'Other', note: ' Paracetamol 2.5 ml ', start, end: null } });

    // Then
    expect(client.logMedication).toHaveBeenNthCalledWith(1, { child: CHILD, name: 'Vitamin D', time: start.toISOString(), notes: 'with the feed' });
    expect(client.logMedication).toHaveBeenNthCalledWith(2, { child: CHILD, name: 'Paracetamol 2.5 ml', time: start.toISOString() });
  });
});
