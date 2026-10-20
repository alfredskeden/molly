import { createElement } from 'react';

import { dayKey } from './model';

/**
 * Web: the browser's own date field, shown under the day choices once "Pick date" is chosen. Today is the
 * latest it allows, as Baby Buddy refuses future dates.
 */
export function DateField({ value, max, onChange }: { value: Date | null; max: Date; onChange: (day: Date) => void; onCancel: () => void; open: boolean }) {
  return createElement('input', {
    type: 'date',
    'aria-label': 'Date',
    value: value ? dayKey(value) : '',
    max: dayKey(max),
    onChange: (event: { target: { value: string } }) => {
      const [year, month, day] = event.target.value.split('-').map(Number);
      if (year && month && day) onChange(new Date(year, month - 1, day));
    },
    className: 'h-[48px] rounded-chip border border-line bg-bg px-3.5 font-sans text-base font-bold text-ink',
  });
}
