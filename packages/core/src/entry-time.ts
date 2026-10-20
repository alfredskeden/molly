import type { Change, Feeding, Medication, Sleep } from '@molly/api';

export function entryTime(entry: Sleep | Feeding | Change | Medication): string {
  return 'time' in entry ? entry.time : entry.start;
}
