import { describe, expect, it } from 'vitest';

import { change, feeding, medication, sleep as sleepEntry } from '../test/fixtures';
import { arcPath, sleepStroke, centreText, editorSubtitle, hourTicks, markTap, placeMarks, ringAngle, ringGhosts, ringPoint, sleepLabels, startLabel, windowDate, pastBoxes, pastBoxesSpoken, ringPager, windowRow, windowStats, windowTitle } from './ring';

/** Thursday 24 September 2026, local time. */
const at = (clock: string, day = 24) => {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return new Date(2026, 8, day, hours, minutes);
};
const day = { start: at('07:00'), end: at('19:00') };

describe("a time's angle on the ring", () => {
  it('is the ring start at the start of the window', () => {
    // When
    const angle = ringAngle(day, at('07:00'));

    // Then
    expect(angle).toBe(16);
  });

  it('is the bottom of the ring half way through a 07:00–19:00 window', () => {
    // When
    const angle = ringAngle(day, at('13:00'));

    // Then
    expect(angle).toBe(180);
  });

  it('is the ring end at the end of the window', () => {
    // When
    const angle = ringAngle(day, at('19:00'));

    // Then
    expect(angle).toBe(344);
  });

  it('is clamped to the ring start before the window', () => {
    // When
    const angle = ringAngle(day, at('05:30'));

    // Then
    expect(angle).toBe(16);
  });

  it('is clamped to the ring end after the window', () => {
    // When
    const angle = ringAngle(day, at('21:00'));

    // Then
    expect(angle).toBe(344);
  });
});

describe('a point on the ring', () => {
  it('is straight above the centre at 0°', () => {
    // When
    const point = ringPoint(0, 132);

    // Then
    expect(point).toEqual({ x: 200, y: 68 });
  });

  it('is to the right of the centre at 90°', () => {
    // When
    const point = ringPoint(90, 132);

    // Then
    expect(point.x).toBeCloseTo(332);
    expect(point.y).toBeCloseTo(200);
  });
});

describe('an arc on the ring', () => {
  it('runs clockwise from its start angle to its end angle', () => {
    // When
    const path = arcPath(90, 180, 100);

    // Then
    expect(path).toBe('M300.0 200.0 A100 100 0 0 1 200.0 300.0');
  });

  it('is drawn at least half a degree long', () => {
    // When
    const path = arcPath(90, 90.1, 100);

    // Then
    expect(path).toBe(arcPath(90, 90.5, 100));
  });

  it('takes the long way round when it spans over 180°', () => {
    // When
    const path = arcPath(16, 344, 132);

    // Then
    expect(path).toMatch(/ A132 132 0 1 1 /);
  });
});

/** How far a round end reaches past its stroke's end on the track, in degrees: half the track's width. */
const CAP = (15 / 132) * (180 / Math.PI);

describe("a sleep's stroke on the track", () => {
  it('stops short by its round ends, so the drawn sleep ends exactly at its start and end times', () => {
    // When
    const stroke = sleepStroke(90, 180);

    // Then
    expect(stroke.cap).toBe('round');
    expect(stroke.from).toBeCloseTo(90 + CAP);
    expect(stroke.to).toBeCloseTo(180 - CAP);
  });

  it('is square-ended at its times when too short for two round ends', () => {
    // When
    const stroke = sleepStroke(90, 95);

    // Then
    expect(stroke).toEqual({ from: 90, to: 95, cap: 'butt' });
  });

  it('keeps two sleeps either side of a short wake apart', () => {
    // When
    const [before, after] = [sleepStroke(60, 150), sleepStroke(155, 240)];

    // Then
    expect(before.to + CAP).toBeLessThanOrEqual(after.from - CAP);
  });
});

describe("the ring's hour ticks", () => {
  it('are none in a window inside one hour', () => {
    // When
    const ticks = hourTicks({ start: at('07:10'), end: at('07:50') });

    // Then
    expect(ticks).toEqual([]);
  });

  it('mark the one whole hour inside a window', () => {
    // When
    const ticks = hourTicks({ start: at('07:30'), end: at('08:30') });

    // Then
    expect(ticks).toEqual([180]);
  });

  it('mark every whole hour strictly inside a 12-hour window', () => {
    // When
    const ticks = hourTicks(day);

    // Then
    expect(ticks).toHaveLength(11);
    expect(ticks[0]).toBeCloseTo(16 + 328 / 12);
  });

  it('fall on clock hours in a window that starts at the morning wake', () => {
    // Given
    const window = { start: at('07:13'), end: at('19:00') };

    // When
    const ticks = hourTicks(window);

    // Then
    expect(ticks).toHaveLength(11);
    expect(ticks[0]).toBeCloseTo(ringAngle(window, at('08:00')));
  });

  it('mark each hour of a 13-hour window', () => {
    // When
    const ticks = hourTicks({ start: at('06:30'), end: at('19:30') });

    // Then
    expect(ticks).toHaveLength(13);
  });

  it('carry on past midnight through a night', () => {
    // Given
    const night = { start: at('19:05'), end: at('07:00', 25) };

    // When
    const ticks = hourTicks(night);

    // Then
    expect(ticks).toHaveLength(11);
    expect(ticks[4]).toBeCloseTo(ringAngle(night, at('00:00', 25)));
  });
});

describe('the marks outside the track', () => {
  it('are none without feeds, diapers or medicine', () => {
    // When
    const marks = placeMarks(day, []);

    // Then
    expect(marks).toEqual([]);
  });

  it('sit at the time of their entry', () => {
    // When
    const marks = placeMarks(day, [{ id: 'feed', at: at('13:00') }]);

    // Then
    expect(marks).toEqual([{ id: 'feed', at: at('13:00'), angle: 180 }]);
  });

  it('sit at their own times when close, so their lines go straight to the track', () => {
    // When
    const marks = placeMarks(day, [
      { id: 'feed', at: at('07:05') },
      { id: 'diaper', at: at('07:06') },
    ]);

    // Then
    expect(marks.map((mark) => mark.angle)).toEqual([ringAngle(day, at('07:05')), ringAngle(day, at('07:06'))]);
  });

  it('keep the order of their times', () => {
    // When
    const marks = placeMarks(day, [
      { id: 'late', at: at('15:00') },
      { id: 'early', at: at('09:00') },
    ]);

    // Then
    expect(marks.map((mark) => mark.id)).toEqual(['early', 'late']);
  });

  it('leave out entries from outside the window', () => {
    // When
    const marks = placeMarks(day, [
      { id: 'before', at: at('06:40') },
      { id: 'inside', at: at('12:00') },
      { id: 'after', at: at('19:00') },
    ]);

    // Then
    expect(marks.map((mark) => mark.id)).toEqual(['inside']);
  });
});

const likely = (start: string, end: string, skipped = false, kind: 'nap' | 'bedtime' = 'nap') => ({
  kind,
  start: at(start),
  end: at(end),
  skipped,
});

describe("the plan's ghosts on the ring", () => {
  it('are none without a plan', () => {
    // When
    const ghosts = ringGhosts(day, [], at('11:40'));

    // Then
    expect(ghosts).toEqual([]);
  });

  it('draw the next nap with how soon it opens, just before it outside the track', () => {
    // When
    const ghosts = ringGhosts(day, [likely('12:56', '13:26')], at('11:40'));

    // Then
    const [from, to] = [ringAngle(day, at('12:56')), ringAngle(day, at('13:26'))];
    expect(ghosts).toEqual([{ from, to, start: at('12:56'), end: at('13:26'), next: true, slot: 1, labels: [{ angle: from - 3, text: 'in 1h 16m' }] }]);
  });

  it('say which sleep of the day each is, the naps numbered after those logged so far', () => {
    // When
    const ghosts = ringGhosts(day, [likely('12:56', '13:26', true), likely('15:20', '15:50'), likely('18:30', '19:00', false, 'bedtime')], at('11:40'), 1);

    // Then
    expect(ghosts.map((ghost) => ghost.slot)).toEqual([2, 'bedtime']);
  });

  it('say now on a nap window that is open', () => {
    // When
    const ghosts = ringGhosts(day, [likely('12:56', '13:26')], at('13:00'));

    // Then
    expect(ghosts[0]?.labels.map((label) => label.text)).toEqual(['now']);
  });

  it('mark only the first as next, and say how far off each later nap is', () => {
    // When
    const ghosts = ringGhosts(day, [likely('12:56', '13:26'), likely('15:20', '15:50')], at('11:40'));

    // Then
    expect(ghosts.map((ghost) => ghost.next)).toEqual([true, false]);
    expect(ghosts[1]?.labels.map((label) => label.text)).toEqual(['in 3h 40m']);
  });

  it('give bedtime its clock time', () => {
    // When
    const ghosts = ringGhosts(day, [likely('18:30', '19:00', false, 'bedtime')], at('11:40'));

    // Then
    expect(ghosts[0]?.labels.map((label) => label.text)).toEqual(['18:30']);
  });

  it('leave out skipped sleeps, and the next one after them is next', () => {
    // When
    const ghosts = ringGhosts(day, [likely('12:56', '13:26', true), likely('15:20', '15:50')], at('11:40'));

    // Then
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]?.next).toBe(true);
    expect(ghosts[0]?.labels[0]?.text).toBe('in 3h 40m');
  });

  it('leave out a window that has already ended', () => {
    // When
    const ghosts = ringGhosts(day, [likely('11:00', '11:30'), likely('15:20', '15:50')], at('11:40'));

    // Then
    expect(ghosts.map((ghost) => ghost.labels[0]?.text)).toEqual(['in 3h 40m']);
  });
});

describe("the ring's centre", () => {
  it('says how long the baby has been awake since the last sleep', () => {
    // When
    const text = centreText({ state: 'awake', since: at('09:01'), afterNap: true, now: at('11:40') });

    // Then
    expect(text).toEqual({ label: 'Awake', tone: 'muted', big: '2h 39m', sub: 'since the nap' });
  });

  it('counts from waking up after the night', () => {
    // When
    const text = centreText({ state: 'awake', since: at('07:13'), afterNap: false, now: at('08:00') });

    // Then
    expect(text.sub).toBe('since waking up');
  });

  it('shows minutes alone under an hour awake', () => {
    // When
    const text = centreText({ state: 'awake', since: at('11:01'), afterNap: true, now: at('11:40') });

    // Then
    expect(text.big).toBe('39m');
  });

  it('says so when no sleep is logged to count from', () => {
    // When
    const text = centreText({ state: 'awake', since: null, afterNap: false, now: at('11:40') });

    // Then
    expect(text).toEqual({ label: 'Awake', tone: 'muted', big: '–', sub: 'No sleep logged yet' });
  });

  it('runs a live timer while a sleep goes', () => {
    // When
    const text = centreText({ state: 'sleeping', since: at('11:36'), nap: true, now: new Date(at('11:40').getTime() + 12_000) });

    // Then
    expect(text).toEqual({ label: 'Sleeping', tone: 'sleep', big: '4:12', sub: 'nap so far' });
  });

  it('shows hours in the timer from an hour on', () => {
    // When
    const text = centreText({ state: 'sleeping', since: at('00:50', 25), nap: false, now: at('02:10', 25) });

    // Then
    expect(text.big).toBe('1:20:00');
    expect(text.sub).toBe('night sleep so far');
  });

  it('runs a live timer in the feed colour while a feed goes', () => {
    // When
    const text = centreText({ state: 'feeding', since: at('11:36'), now: at('11:40') });

    // Then
    expect(text).toEqual({ label: 'Feeding', tone: 'feed', big: '4:00', sub: 'so far' });
  });

  it('sums up a past day by its sleep, naps and feeds', () => {
    // When
    const text = centreText({ state: 'past', kind: 'day', sleptMs: 194 * 60_000, naps: 3, feeds: 4, diapers: 5 });

    // Then
    expect(text).toEqual({ label: 'Slept', tone: 'muted', big: '3h 14m', sub: '3 naps · 4 feeds' });
  });

  it('sums up a past night by its sleep, feeds and diapers', () => {
    // When
    const text = centreText({ state: 'past', kind: 'night', sleptMs: 650 * 60_000, naps: 3, feeds: 2, diapers: 1 });

    // Then
    expect(text).toEqual({ label: 'Slept', tone: 'muted', big: '10h 50m', sub: '2 feeds · 1 diaper' });
  });

  it('counts one nap and one feed in the singular', () => {
    // When
    const text = centreText({ state: 'past', kind: 'day', sleptMs: 0, naps: 1, feeds: 1, diapers: 0 });

    // Then
    expect(text.sub).toBe('1 nap · 1 feed');
  });
});

describe('the window row under the ring', () => {
  const plan = [likely('12:56', '13:26'), likely('15:20', '15:50'), likely('18:30', '19:00', false, 'bedtime')];

  it('is hidden without a plan', () => {
    // When
    const row = windowRow([], 1, at('11:40'));

    // Then
    expect(row).toBeNull();
  });

  it('names the next nap by its place in the day, the clock time it opens and how soon', () => {
    // When
    const row = windowRow(plan.slice(0, 1), 1, at('11:40'));

    // Then
    expect(row).toEqual({ title: 'Nap 2 likely', range: '12:56', when: 'in 1h 16m', then: null });
  });

  it('keeps the nap clock time while the window is open', () => {
    // When
    const row = windowRow(plan, 1, at('13:06'));

    // Then
    expect(row).toMatchObject({ range: '12:56', when: '20m left' });
  });

  it('keeps the nap clock time once the window has closed', () => {
    // When
    const row = windowRow(plan, 1, at('13:40'));

    // Then
    expect(row).toMatchObject({ range: '12:56', when: '14m ago' });
  });

  it('lists how far off the later naps are, and bedtime, on the line under it', () => {
    // When
    const row = windowRow(plan, 1, at('11:40'));

    // Then
    expect(row?.then).toBe('Then nap 3 in 3h 40m · bedtime 18:30');
  });

  it('rounds a countdown up to the minute, so seconds after 11:40 it still opens in 1h 16m', () => {
    // When
    const row = windowRow(plan, 1, new Date(at('11:40').getTime() + 5_000));

    // Then
    expect(row?.when).toBe('in 1h 16m');
  });

  it('says how long is left while the window is open', () => {
    // When
    const row = windowRow(plan, 1, at('13:06'));

    // Then
    expect(row?.when).toBe('20m left');
  });

  it('says how long ago the window closed once it has', () => {
    // When
    const row = windowRow(plan, 1, at('13:40'));

    // Then
    expect(row?.when).toBe('14m ago');
  });

  it('calls the first nap of a day with none yet nap 1', () => {
    // When
    const row = windowRow(plan, 0, at('08:00'));

    // Then
    expect(row?.title).toBe('Nap 1 likely');
  });

  it('names bedtime with its clock times when it is next', () => {
    // When
    const row = windowRow(plan.slice(2), 3, at('17:00'));

    // Then
    expect(row).toEqual({ title: 'Bedtime likely', range: '18:30–19:00', when: 'in 1h 30m', then: null });
  });

  it('skips a skipped nap, so the next one takes its number', () => {
    // When
    const row = windowRow([likely('12:56', '13:26', true), ...plan.slice(1)], 1, at('11:40'));

    // Then
    expect(row?.title).toBe('Nap 2 likely');
    expect(row?.when).toBe('in 3h 40m');
    expect(row?.then).toBe('Then bedtime 18:30');
  });
});

describe("the editor's subtitle", () => {
  it('gives a recent sleep its length and how long ago it ended', () => {
    // When
    const sub = editorSubtitle({ start: at('09:32'), end: at('10:41') }, at('12:41'), 'Today');

    // Then
    expect(sub).toBe('1h 9m · ended 2h 0m ago');
  });

  it("gives a sleep that ended over 12 hours ago its window's title instead", () => {
    // When
    const sub = editorSubtitle({ start: at('09:32', 23), end: at('10:41', 23) }, at('12:41'), 'Yesterday');

    // Then
    expect(sub).toBe('1h 9m · Yesterday');
  });

  it('gives a diaper how long ago it was', () => {
    // When
    const sub = editorSubtitle({ start: at('11:10') }, at('11:40'), 'Today');

    // Then
    expect(sub).toBe('30m ago');
  });

  it("gives an old diaper its window's title", () => {
    // When
    const sub = editorSubtitle({ start: at('22:10', 23) }, at('11:40'), 'Last night');

    // Then
    expect(sub).toBe('Last night');
  });

  it('gives the running sleep its length so far', () => {
    // When
    const sub = editorSubtitle({ start: at('11:00'), end: null }, at('11:40'), 'Today');

    // Then
    expect(sub).toBe('40m so far');
  });
});

describe("a window's title", () => {
  const today = { kind: 'day' as const, start: at('07:13'), end: at('19:00') };
  const tonight = { kind: 'night' as const, start: at('19:05'), end: at('07:00', 25) };
  const lastNight = { kind: 'night' as const, start: at('19:10', 23), end: at('07:00') };

  it('is Today for the live day', () => {
    // When
    const title = windowTitle(today, today);

    // Then
    expect(title).toBe('Today');
  });

  it('is Last night for the night before the live day', () => {
    // When
    const title = windowTitle(lastNight, today);

    // Then
    expect(title).toBe('Last night');
  });

  it('is Tonight for the live night', () => {
    // When
    const title = windowTitle(tonight, tonight);

    // Then
    expect(title).toBe('Tonight');
  });

  it('is still Today for the day that just ended under a live night', () => {
    // When
    const title = windowTitle(today, tonight);

    // Then
    expect(title).toBe('Today');
  });

  it('is Yesterday for the day before', () => {
    // When
    const title = windowTitle({ kind: 'day', start: at('07:00', 23) }, today);

    // Then
    expect(title).toBe('Yesterday');
  });

  it('is the weekday for an older day', () => {
    // When
    const title = windowTitle({ kind: 'day', start: at('07:00', 22) }, today);

    // Then
    expect(title).toBe('Tuesday');
  });

  it("is the weekday's night for an older night", () => {
    // When
    const title = windowTitle({ kind: 'night', start: at('19:00', 22) }, today);

    // Then
    expect(title).toBe('Tuesday night');
  });

  it("is the weekday's night for last night under a live night", () => {
    // When
    const title = windowTitle(lastNight, tonight);

    // Then
    expect(title).toBe('Wednesday night');
  });
});

describe("a window's date", () => {
  it('is the short weekday, day and month it starts on', () => {
    // When
    const date = windowDate({ start: at('19:05') });

    // Then
    expect(date).toBe('Thu 24 Sep');
  });
});

describe("the label by the ring's cap", () => {
  it('says when a day started from the morning wake', () => {
    // When
    const label = startLabel({ kind: 'day', start: at('07:13'), clock: false });

    // Then
    expect(label).toBe('Day started 07:13');
  });

  it('says when a night started from bedtime', () => {
    // When
    const label = startLabel({ kind: 'night', start: at('19:05'), clock: false });

    // Then
    expect(label).toBe('Bedtime 19:05');
  });

  it('is left out when no wake or bedtime was logged and the clock stood in', () => {
    // When
    const label = startLabel({ kind: 'day', start: at('07:00'), clock: true });

    // Then
    expect(label).toBeNull();
  });
});

const sleep = (key: string, start: string, end: string, running = false) => ({ key, start: at(start), end: at(end), running });

describe("the sleeps' clock times inside the ring", () => {
  it('are none without sleeps', () => {
    // When
    const labels = sleepLabels(day, []);

    // Then
    expect(labels).toEqual([]);
  });

  it("put a nap's start and end at their places on the ring", () => {
    // When
    const labels = sleepLabels(day, [sleep('nap', '09:00', '11:00')]);

    // Then
    expect(labels).toEqual([
      { key: 'nap', angle: ringAngle(day, at('09:00')), text: '09:00' },
      { key: 'nap', angle: ringAngle(day, at('11:00')), text: '11:00' },
    ]);
  });

  it('give a running sleep only its start', () => {
    // When
    const labels = sleepLabels(day, [sleep('nap', '09:00', '09:40', true)]);

    // Then
    expect(labels.map((label) => label.text)).toEqual(['09:00']);
  });

  it('leave out a time outside the window', () => {
    // When
    const labels = sleepLabels(day, [sleep('night', '06:10', '18:00'), sleep('late', '18:30', '20:00')]);

    // Then
    expect(labels.map((label) => label.text)).toEqual(['18:00', '18:30']);
  });

  it("join a short nap's start and end in one label at its middle", () => {
    // When
    const labels = sleepLabels(day, [sleep('nap', '12:00', '12:30')]);

    // Then
    const middle = (ringAngle(day, at('12:00')) + ringAngle(day, at('12:30'))) / 2;
    expect(labels).toEqual([{ key: 'nap', angle: middle, text: '12:00–12:30' }]);
  });

  it("move a label clear of the one before it from another sleep", () => {
    // When
    const labels = sleepLabels(day, [sleep('first', '09:00', '12:00'), sleep('second', '12:10', '15:00')]);

    // Then
    const [, end, start] = labels;
    expect(start!.text).toBe('12:10');
    expect(start!.angle).toBeGreaterThan(ringAngle(day, at('12:10')));
    expect(overlap(end!, start!)).toBe(false);
  });

  it('drop a label that would have to move too far', () => {
    // When
    const labels = sleepLabels(day, [
      sleep('a', '08:00', '12:00'),
      sleep('b', '12:02', '12:04'),
      sleep('c', '12:06', '12:08'),
      sleep('d', '12:10', '16:00'),
    ]);

    // Then
    expect(labels.length).toBeLessThan(5);
    labels.slice(1).forEach((label, index) => expect(overlap(labels[index]!, label)).toBe(false));
  });
});

/** The label boxes as drawn: 6.4 px a character, 16 px tall, at the label radius. */
function overlap(a: { angle: number; text: string }, b: { angle: number; text: string }) {
  const [pa, pb] = [ringPoint(a.angle, 96), ringPoint(b.angle, 96)];
  return Math.abs(pa.x - pb.x) < (a.text.length + b.text.length) * 3.2 + 4 && Math.abs(pa.y - pb.y) < 18;
}

const mark = (key: string, angle: number) => ({ key, angle });

describe('a tap on a mark', () => {
  it('selects the mark tapped when it stands alone', () => {
    // When
    const key = markTap([mark('feed', 90), mark('diaper', 180)], 'feed', null);

    // Then
    expect(key).toBe('feed');
  });

  it('selects the one underneath on a second tap where marks overlap', () => {
    // When
    const key = markTap([mark('diaper', 90), mark('feed', 92)], 'feed', 'feed');

    // Then
    expect(key).toBe('diaper');
  });

  it('closes after the oldest of a stack, as a second tap on a lone mark does', () => {
    // When
    const key = markTap([mark('diaper', 90), mark('feed', 92)], 'diaper', 'diaper');

    // Then
    expect(key).toBe('diaper');
  });

  it('selects the tapped mark when the selection is somewhere else', () => {
    // When
    const key = markTap([mark('diaper', 90), mark('feed', 92), mark('med', 200)], 'feed', 'med');

    // Then
    expect(key).toBe('feed');
  });
});

describe("a past window's stats", () => {
  const none = { sleep: [], feeding: [], change: [], medication: [] };
  const iso = (clock: string, date = 24) => at(clock, date).toISOString();

  it('are all zero with nothing logged in the window', () => {
    // When
    const stats = windowStats(day, none);

    // Then
    expect(stats).toEqual({ sleptMs: 0, naps: 0, feeds: 0, diapers: 0, medicine: 0 });
  });

  it('count one of each inside the window, with the sleep in full', () => {
    // Given
    const entries = {
      sleep: [sleepEntry({ start: iso('09:00'), end: iso('10:30') })],
      feeding: [feeding({ start: iso('08:00'), end: iso('08:20') })],
      change: [change({ time: iso('08:30') })],
      medication: [medication({ time: iso('11:00') })],
    };

    // When
    const stats = windowStats(day, entries);

    // Then
    expect(stats).toEqual({ sleptMs: 90 * 60_000, naps: 1, feeds: 1, diapers: 1, medicine: 1 });
  });

  it('sum several sleeps and count several naps and feeds', () => {
    // Given
    const entries = {
      ...none,
      sleep: [sleepEntry({ start: iso('09:00'), end: iso('10:00') }), sleepEntry({ start: iso('13:00'), end: iso('14:30') })],
      feeding: [
        feeding({ start: iso('08:00'), end: iso('08:20') }),
        feeding({ start: iso('11:00'), end: iso('11:15') }),
        feeding({ start: iso('15:00'), end: iso('15:20') }),
      ],
    };

    // When
    const stats = windowStats(day, entries);

    // Then
    expect(stats).toMatchObject({ sleptMs: 150 * 60_000, naps: 2, feeds: 3 });
  });

  it("clip a sleep crossing the window's start, without counting it as a nap", () => {
    // Given
    const entries = { ...none, sleep: [sleepEntry({ start: iso('05:00'), end: iso('07:30') })] };

    // When
    const stats = windowStats(day, entries);

    // Then
    expect(stats).toMatchObject({ sleptMs: 30 * 60_000, naps: 0 });
  });

  it("count entries at the window's start and leave out those at its end", () => {
    // Given
    const entries = {
      sleep: [sleepEntry({ start: iso('19:00'), end: iso('20:00') })],
      feeding: [feeding({ start: iso('07:00'), end: iso('07:20') }), feeding({ start: iso('19:00'), end: iso('19:20') })],
      change: [change({ time: iso('07:00') }), change({ time: iso('19:00') })],
      medication: [medication({ time: iso('19:00') })],
    };

    // When
    const stats = windowStats(day, entries);

    // Then
    expect(stats).toEqual({ sleptMs: 0, naps: 0, feeds: 1, diapers: 1, medicine: 0 });
  });
});

describe('the pager over a past ring', () => {
  // Live Thursday, then back one window at a time: newest first, day and night alternating.
  const today = { kind: 'day' as const, start: at('07:13'), end: at('19:00') };
  const lastNight = { kind: 'night' as const, start: at('19:10', 23), end: at('07:13') };
  const yesterday = { kind: 'day' as const, start: at('07:00', 23), end: at('19:10', 23) };
  const tuesdayNight = { kind: 'night' as const, start: at('19:00', 22), end: at('07:00', 23) };
  const windows = [today, lastNight, yesterday, tuesdayNight];
  const loaded = { loadedFrom: at('00:00', 22), olderMayExist: true };

  it('offers the live ring next from the newest past ring', () => {
    // When
    const pager = ringPager({ windows, index: 1, ...loaded });

    // Then
    expect(pager.next).toEqual({ window: today, title: 'Today', spoken: 'Next: Today', live: true });
  });

  it('offers the newer past ring next from an older one', () => {
    // When
    const pager = ringPager({ windows, index: 2, ...loaded });

    // Then
    expect(pager.next).toEqual({ window: lastNight, title: 'Last night', spoken: 'Next: Last night', live: false });
  });

  it('offers the loaded window before as previous', () => {
    // When
    const pager = ringPager({ windows, index: 2, ...loaded });

    // Then
    expect(pager.previous).toEqual({ window: tuesdayNight, title: 'Tuesday night', spoken: 'Previous: Tuesday night', enabled: true, load: false });
  });

  it("asks for the window before when it isn't in the list yet but older may exist", () => {
    // When
    const pager = ringPager({ windows, index: 3, ...loaded });

    // Then
    expect(pager.previous).toEqual({ window: null, title: 'Tuesday', spoken: 'Previous: Tuesday', enabled: true, load: true });
  });

  it('asks for the window before when it starts before what is loaded', () => {
    // When
    const pager = ringPager({ windows, index: 2, loadedFrom: at('00:00', 23), olderMayExist: true });

    // Then
    expect(pager.previous).toMatchObject({ enabled: true, load: true });
  });

  it('turns previous off when nothing older may exist', () => {
    // When
    const pager = ringPager({ windows, index: 3, loadedFrom: at('00:00', 22), olderMayExist: false });

    // Then
    expect(pager.previous).toMatchObject({ title: 'Tuesday', spoken: 'Previous: Tuesday', enabled: false });
  });

  it('names the live night Tonight when it is next', () => {
    // Given
    const tonight = { kind: 'night' as const, start: at('19:00'), end: at('07:00', 25) };

    // When
    const pager = ringPager({ windows: [tonight, today, lastNight], index: 1, ...loaded });

    // Then
    expect(pager.next).toMatchObject({ title: 'Tonight', spoken: 'Next: Tonight', live: true });
  });

  it('steps back through days and nights in turn', () => {
    // When
    const titles = [1, 2, 3].map((index) => ringPager({ windows, index, ...loaded }).previous.title);

    // Then
    expect(titles).toEqual(['Yesterday', 'Tuesday night', 'Tuesday']);
  });
});

describe("a past ring's stat boxes", () => {
  const stats = { sleptMs: 130 * 60_000, naps: 3, feeds: 7, diapers: 5, medicine: 1 };

  it('are slept, naps, feeds and diapers on a day', () => {
    // When
    const boxes = pastBoxes('day', stats);

    // Then
    expect(boxes.map(({ kind, value, label }) => [kind, value, label])).toEqual([
      ['sleep', '2h 10m', 'slept'],
      ['nap', '3', 'naps'],
      ['feed', '7', 'feeds'],
      ['diaper', '5', 'diapers'],
    ]);
  });

  it('are slept, feeds, diapers and medicine on a night', () => {
    // When
    const boxes = pastBoxes('night', stats);

    // Then
    expect(boxes.map(({ kind, label }) => [kind, label])).toEqual([
      ['sleep', 'slept'],
      ['feed', 'feeds'],
      ['diaper', 'diapers'],
      ['med', 'medicine'],
    ]);
  });

  it('say nap, feed and diaper for one', () => {
    // When
    const boxes = pastBoxes('day', { sleptMs: 0, naps: 1, feeds: 1, diapers: 1, medicine: 1 });

    // Then
    expect(boxes.map(({ value, label }) => `${value} ${label}`)).toEqual(['0m slept', '1 nap', '1 feed', '1 diaper']);
  });

  it('read as one line after the title', () => {
    // When
    const spoken = pastBoxesSpoken('Yesterday', pastBoxes('day', stats));

    // Then
    expect(spoken).toBe('Yesterday: 2h 10m slept, 3 naps, 7 feeds, 5 diapers');
  });
});
