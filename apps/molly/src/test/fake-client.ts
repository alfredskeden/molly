import type { Change, Feeding, Medication, Sleep, Timer } from '@molly/api';
import { vi } from 'vitest';

import type { TrackerClient } from '@/actions/trackers';

export const CHILD = 1;

export const runningSleep: Timer = {
  id: 7,
  child: CHILD,
  name: 'molly:sleep',
  start: '2026-09-20T12:15:00Z',
  duration: '',
  user: 2,
};

export const savedSleep: Sleep = {
  id: 31,
  child: CHILD,
  start: runningSleep.start,
  end: '2026-09-20T13:00:00Z',
  duration: '00:45:00',
  nap: true,
  notes: null,
  tags: [],
};

export const savedFeeding: Feeding = {
  id: 32,
  child: CHILD,
  start: '2026-09-20T12:15:00Z',
  end: '2026-09-20T12:29:00Z',
  duration: '00:14:00',
  type: 'formula',
  method: 'bottle',
  amount: 120,
  notes: null,
  tags: [],
};

export const savedChange: Change = {
  id: 33,
  child: CHILD,
  time: '2026-09-20T12:40:00Z',
  wet: true,
  solid: true,
  color: '',
  amount: null,
  notes: null,
  tags: [],
};

export const savedMedication: Medication = {
  id: 34,
  child: CHILD,
  name: 'Vitamin D',
  time: '2026-09-20T12:45:00Z',
  notes: null,
  tags: [],
};

export function fakeClient(overrides: Partial<TrackerClient> = {}): TrackerClient {
  return {
    findTimer: vi.fn(async () => null),
    startTimer: vi.fn(async (ref) => ({ ...runningSleep, ...ref })),
    stopSleep: vi.fn(),
    stopFeeding: vi.fn(),
    cancelTimer: vi.fn(async () => undefined),
    logChange: vi.fn(),
    logMedication: vi.fn(),
    logSleep: vi.fn(),
    logFeeding: vi.fn(),
    updateTimer: vi.fn(),
    editEntry: vi.fn(),
    getLatestEntry: vi.fn(async () => null),
    ...overrides,
  } as TrackerClient;
}
