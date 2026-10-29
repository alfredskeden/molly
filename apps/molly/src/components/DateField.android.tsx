import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect } from 'react';

import type { DateFieldProps } from './DateField';

/**
 * Android: opens the system date dialog when `open` turns on; nothing of its own on screen. Days outside
 * `min` / `max` are disabled, and a `value` outside them opens on the nearest bound.
 */
export function DateField({ value, min, max, onChange, onCancel, open }: DateFieldProps) {
  useEffect(() => {
    if (!open) return;
    DateTimePickerAndroid.open({
      value: value ?? max ?? min ?? new Date(),
      minimumDate: min,
      maximumDate: max,
      mode: 'date',
      onChange: (event, day) => {
        if (event.type === 'set' && day) onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate()));
        else onCancel();
      },
    });
    // Opened once per `open`; the dialog keeps its own state until it answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return null;
}
