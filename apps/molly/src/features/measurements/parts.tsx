import type { MeasurementRow } from '@molly/core';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';

/** The latest entries: date, value and the change from the one before. */
export function EntryList({ rows, dateWidth = 62 }: { rows: (MeasurementRow & { chip?: ReactNode })[]; dateWidth?: number }) {
  return (
    <View className="px-1">
      {rows.map((row, i) => (
        <View
          key={`${row.date}-${i}`}
          accessible
          accessibilityLabel={[row.date, row.value, row.change].filter(Boolean).join(', ')}
          className="flex-row items-center gap-3 border-b border-line py-[11px]"
        >
          <Text className="text-[15px] font-extrabold" style={{ width: dateWidth }}>
            {row.date}
          </Text>
          <Text className="flex-1 text-[15px] font-extrabold tabular-nums">{row.value}</Text>
          {row.chip ?? <Text className="text-caption font-bold text-muted">{row.change}</Text>}
        </View>
      ))}
    </View>
  );
}

export function Footer({ children }: { children: ReactNode }) {
  return <Text className="px-1 text-caption font-bold text-muted">{children}</Text>;
}
