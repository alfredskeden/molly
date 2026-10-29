import { localDay } from '@molly/core';
import { createElement } from 'react';

export type DateFieldProps = {
  value: Date | null;
  /** The earliest day allowed. */
  min?: Date;
  /** The latest day allowed. */
  max?: Date;
  /** The field's spoken name on the web; `Date` unless given. */
  label?: string;
  /** Android: the dialog opens when this turns on. */
  open: boolean;
  /** Local midnight of the day chosen. */
  onChange: (day: Date) => void;
  /** Android: the dialog was dismissed. */
  onCancel: () => void;
};

/**
 * Web: the browser's own date field. Android has its dialog in `DateField.android.tsx`; this sibling keeps
 * the same `.tsx` extension so Metro picks the platform file.
 */
export function DateField({ value, min, max, label = 'Date', onChange }: DateFieldProps) {
  return createElement('input', {
    type: 'date',
    'aria-label': label,
    value: value ? localDay(value) : '',
    min: min ? localDay(min) : undefined,
    max: max ? localDay(max) : undefined,
    onChange: (event: { target: { value: string } }) => {
      const [year, month, day] = event.target.value.split('-').map(Number);
      if (year && month && day) onChange(new Date(year, month - 1, day));
    },
    className: 'h-[48px] rounded-chip border border-line bg-bg px-3.5 font-sans text-base font-bold text-ink',
  });
}
