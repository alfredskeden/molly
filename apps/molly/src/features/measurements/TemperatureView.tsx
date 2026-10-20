import type { Temperature } from '@molly/api';
import { feverCard, TEMPERATURE_SCALE, temperatureRows, temperatureView, type TemperatureZone } from '@molly/core';
import { View } from 'react-native';

import { FIXED_SCALE, Panel, Text } from '@/components/ui';

import { EntryList } from './parts';

/** Zone colours: chip background and text. */
const ZONES: Record<TemperatureZone, { bg: string; ink: string }> = {
  Low: { bg: 'bg-cool-bg', ink: 'text-ink' },
  Normal: { bg: 'bg-grow-bg', ink: 'text-grow-ink' },
  Raised: { bg: 'bg-warm-bg', ink: 'text-ink' },
  Fever: { bg: 'bg-hot-bg', ink: 'text-hot-ink' },
};

const span = TEMPERATURE_SCALE.max - TEMPERATURE_SCALE.min;
/** Each zone's share of the bar, from where it starts: 35.5, 36, 37.5, 38 → 40. */
const BAR: { zone: TemperatureZone; from: number; to: number }[] = [
  { zone: 'Low', from: 35.5, to: 36 },
  { zone: 'Normal', from: 36, to: 37.5 },
  { zone: 'Raised', from: 37.5, to: 38 },
  { zone: 'Fever', from: 38, to: 40 },
];

/** Temperature (1e): the zone bar with the latest reading and pins for the four before, the fever card. */
export function TemperatureBar({ readings, now }: { readings: Temperature[]; now: Date }) {
  const view = temperatureView(readings, now);
  const fever = feverCard(readings, now);
  return (
    <>
      <Panel className="gap-2 p-4">
        <View aria-hidden className="h-9 flex-row overflow-hidden rounded-[10px]">
          {BAR.map(({ zone, from, to }) => (
            <View key={zone} className={ZONES[zone].bg} style={{ flex: (to - from) / span }} />
          ))}
        </View>
        <View aria-hidden className="h-0">
          {view.pins.map((pin, i) => (
            <View
              key={i}
              className="absolute -top-[30px] -ml-0.5 h-6 w-1 rounded-sm bg-ink"
              style={{ left: `${pin.x * 100}%`, opacity: pin.fade }}
            />
          ))}
          {view.latest && (
            <View
              className="absolute -top-10 -ml-2.5 h-11 w-5 rounded-[10px] border-[3px] border-surface bg-ink"
              style={{ left: `${view.latest.x * 100}%` }}
            />
          )}
        </View>
        <View aria-hidden className="flex-row pt-2">
          {BAR.map(({ zone, from, to }) => (
            <Text key={zone} maxFontSizeMultiplier={FIXED_SCALE} className="text-xs font-extrabold text-muted tabular-nums" style={{ flex: (to - from) / span }}>
              {String(from)}
            </Text>
          ))}
          <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-xs font-extrabold text-muted">
            40
          </Text>
        </View>
        <View aria-hidden className="flex-row flex-wrap gap-3.5">
          {BAR.map(({ zone }) => (
            <Text key={zone} maxFontSizeMultiplier={FIXED_SCALE} className="text-xs font-extrabold text-muted">
              {zone}
            </Text>
          ))}
        </View>
      </Panel>
      {fever && (
        <View accessible className="gap-0.5 rounded-card bg-hot-bg px-4 py-3.5">
          <Text className="text-base font-display text-hot-ink">{fever.title}</Text>
          <Text className="text-sm font-bold text-hot-ink">{fever.detail}</Text>
        </View>
      )}
      <EntryList
        dateWidth={104}
        rows={temperatureRows(readings, now, 5).map((row) => ({
          date: row.date,
          value: row.value,
          change: row.zone,
          chip: (
            <View className={`rounded-[8px] px-2 py-0.5 ${ZONES[row.zone].bg}`}>
              <Text className={`text-xs font-display ${ZONES[row.zone].ink}`}>{row.zone}</Text>
            </View>
          ),
        }))}
      />
    </>
  );
}
