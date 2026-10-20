import type { FeedingMethod } from '@molly/api';
import type { TimelineItem } from '@molly/core';

import { formatClock, formatElapsed, spokenDuration } from '@/lib/time';

export const METHOD_LABELS: Record<FeedingMethod, string> = {
  'left breast': 'Left',
  'right breast': 'Right',
  'both breasts': 'Both',
  bottle: 'Bottle',
  'parent fed': 'Parent fed',
  'self fed': 'Self fed',
};

export function diaperLabel({ wet, solid }: { wet: boolean; solid: boolean }): string {
  return wet && solid ? 'Wet + dirty' : solid ? 'Dirty' : 'Wet';
}

const duration = ({ start, end }: { start: string; end: string }) =>
  formatElapsed(Date.parse(end) - Date.parse(start));

/** A Recent row: what it was, and the one detail worth a glance. */
export function describeEntry(item: TimelineItem): { title: string; detail: string } {
  switch (item.kind) {
    case 'sleep':
      return { title: item.entry.nap ? 'Nap' : 'Night sleep', detail: duration(item.entry) };
    case 'feeding': {
      const { entry } = item;
      const detail = entry.method === 'bottle' && entry.amount !== null ? `${entry.amount} ml` : duration(entry);
      return { title: `Feed · ${METHOD_LABELS[entry.method]}`, detail };
    }
    case 'change':
      return { title: `Diaper · ${diaperLabel(item.entry)}`, detail: item.entry.color };
    case 'medication':
      return { title: item.entry.name, detail: 'Medication' };
  }
}

/** A row for screen readers: "Feed at 08:15, Left, 17 minutes. Edit." Durations spoken, the dot and › left out. */
export function spokenEntry(item: TimelineItem): string {
  const at = formatClock(item.at);
  const took = ({ start, end }: { start: string; end: string }) => spokenDuration(Date.parse(end) - Date.parse(start));
  const parts = (() => {
    switch (item.kind) {
      case 'sleep':
        return [`${item.entry.nap ? 'Nap' : 'Night sleep'} at ${at}`, took(item.entry)];
      case 'feeding': {
        const { entry } = item;
        const amount = entry.method === 'bottle' && entry.amount !== null ? `${entry.amount} ml` : took(entry);
        return [`Feed at ${at}`, METHOD_LABELS[entry.method], amount];
      }
      case 'change':
        return [`Diaper at ${at}`, diaperLabel(item.entry), item.entry.color];
      case 'medication':
        return [`${item.entry.name} at ${at}`, 'medication'];
    }
  })();
  return `${parts.filter(Boolean).join(', ')}. Edit.`;
}
