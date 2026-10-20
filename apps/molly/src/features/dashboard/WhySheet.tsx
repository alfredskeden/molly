import type { NextSleep } from '@molly/core';
import { View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button, Text } from '@/components/ui';

import { whyRows } from './prediction-text';

const KIND = { nap: 'Nap likely', bedtime: 'Bedtime likely' } as const;

/** "Why this window": where the next-sleep window came from. Read-only; Done or the scrim closes it. */
export function WhySheet({
  next,
  ageMonths,
  when,
  onClose,
}: {
  next: NextSleep;
  ageMonths: number;
  /** The window row's words: `in 1h 16m` for a nap, bedtime's clock times. */
  when: string;
  onClose: () => void;
}) {
  const rows = whyRows(next, ageMonths, new Date());
  return (
    <Sheet label="Why this window" onScrimPress={onClose}>
      <View className="gap-0.5">
        <Text className="text-label font-extrabold text-muted">{KIND[next.kind]}</Text>
        <Text maxFontSizeMultiplier={1.4} className="text-[40px] font-display leading-[46px] tracking-display-1_2">
          {when}
        </Text>
      </View>
      <View>
        {rows.map((row, index) => (
          <View
            key={row.label}
            accessible
            className={`flex-row flex-wrap items-center justify-between gap-x-3 py-3 ${index < rows.length - 1 ? 'border-b border-line' : ''}`}
          >
            <View className="flex-shrink">
              <Text className="text-label font-bold text-muted">{row.label}</Text>
              {row.detail && <Text className="text-caption font-bold text-muted">{row.detail}</Text>}
            </View>
            <Text className="text-label font-display">{row.value}</Text>
          </View>
        ))}
      </View>
      <Text className="text-sm font-semibold leading-[21px] text-muted">
        {"An estimate from past sleeps and a general age guide. Not medical advice. Follow your baby's cues."}
      </Text>
      <Button tone="sleep" label="Done" onPress={onClose} />
    </Sheet>
  );
}
