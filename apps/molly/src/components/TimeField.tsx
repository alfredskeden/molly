import { clockText } from '@molly/core';
import { createElement } from 'react';

export type TimeFieldProps = {
  /** Minutes past midnight. */
  value: number;
  /** The field's spoken name on the web; `Time` unless given. */
  label?: string;
  /** Android: the dialog opens when this turns on. */
  open: boolean;
  /** Minutes past midnight of the time chosen. */
  onChange: (minutes: number) => void;
  /** Android: the dialog was dismissed. */
  onCancel: () => void;
};

const CLOCK = /^(\d{2}):(\d{2})/;

/**
 * Web: the browser's own time field (`HH:MM`). Android has its dialog in `TimeField.android.tsx`; this
 * sibling keeps the same `.tsx` extension so Metro picks the platform file.
 */
export function TimeField({ value, label = 'Time', onChange }: TimeFieldProps) {
  return createElement('input', {
    type: 'time',
    'aria-label': label,
    value: clockText(new Date(2000, 0, 1, 0, value)),
    onChange: (event: { target: { value: string } }) => {
      const match = CLOCK.exec(event.target.value);
      if (match) onChange(Number(match[1]) * 60 + Number(match[2]));
    },
    className: 'h-[48px] rounded-chip border border-line bg-bg px-3.5 font-sans text-base font-bold text-ink',
  });
}
