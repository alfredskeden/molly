import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect } from 'react';

import type { TimeFieldProps } from './TimeField';

/**
 * Android: opens the system 24-hour clock dialog when `open` turns on; nothing of its own on screen. Its
 * keyboard icon switches to typing the hours and minutes.
 */
export function TimeField({ value, onChange, onCancel, open }: TimeFieldProps) {
  useEffect(() => {
    if (!open) return;
    DateTimePickerAndroid.open({
      value: new Date(2000, 0, 1, 0, value),
      mode: 'time',
      is24Hour: true,
      onChange: (event, time) => {
        if (event.type === 'set' && time) onChange(time.getHours() * 60 + time.getMinutes());
        else onCancel();
      },
    });
    // Opened once per `open`; the dialog keeps its own state until it answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return null;
}
