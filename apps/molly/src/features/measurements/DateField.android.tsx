import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect } from 'react';

/** Android: opens the system date dialog when `open` turns on; nothing of its own on screen. */
export function DateField({
  value,
  max,
  onChange,
  onCancel,
  open,
}: {
  value: Date | null;
  max: Date;
  onChange: (day: Date) => void;
  onCancel: () => void;
  open: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    DateTimePickerAndroid.open({
      value: value ?? max,
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
