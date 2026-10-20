import type { HeadCircumference, Height } from '@molly/api';
import { bmiBars, bmiFormula, headRings, heightView, type MeasurementLists } from '@molly/core';
import { Fragment, useState } from 'react';
import { View } from 'react-native';

import { FIXED_SCALE, Panel, Text } from '@/components/ui';

const DOOR_HEIGHT = 420;

/** Height (1c, 2c): a doorframe ruler with a mark per height, older marks fainter. */
export function HeightDoorframe({ heights, birthDate, now }: { heights: Height[]; birthDate: string; now: Date }) {
  const { ruler, marks } = heightView(heights, birthDate, now);
  const [height, setHeight] = useState(DOOR_HEIGHT - 36);
  const bottom = (cm: number) => ((cm - ruler.min) / (ruler.max - ruler.min)) * height;
  return (
    <Panel className="flex-row px-4 py-[18px]">
      <View
        aria-hidden
        className="w-11 rounded-[8px] bg-warm-bg"
        style={{ height: DOOR_HEIGHT - 36 }}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        {ruler.ticks.map((tick) => (
          <View key={tick.cm} className="absolute right-0" style={{ bottom: bottom(tick.cm) }}>
            <View className="h-[1.5px] bg-ink opacity-55" style={{ width: tick.long ? 18 : 9 }} />
          </View>
        ))}
        {ruler.ticks
          .filter((tick) => tick.label)
          .map((tick) => (
            <Text key={tick.cm} maxFontSizeMultiplier={FIXED_SCALE} className="absolute left-[5px] text-[11px] font-extrabold" style={{ bottom: bottom(tick.cm) - 8 }}>
              {tick.label}
            </Text>
          ))}
      </View>
      <View className="flex-1">
        {marks.map((mark) => (
          <View
            key={`${mark.label}-${mark.cm}`}
            accessible
            accessibilityLabel={`${mark.value}, ${mark.label}`}
            className="absolute left-0 right-0 flex-row items-center gap-2"
            style={{ bottom: bottom(mark.cm) - 10, opacity: mark.fade }}
          >
            <View className="h-[3px] w-14 rounded-sm bg-grow-ink" />
            <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-[15px] font-display">
              {mark.value}
            </Text>
            <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-caption font-bold text-muted">
              {mark.label}
            </Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

const RINGS_HEIGHT = 320;
/** The largest ring's diameter, as a share of the card's height. */
const RING_MAX = 280 / RINGS_HEIGHT;

/** Head circumference (1d): a ring per entry, birth in the centre. */
export function HeadRings({ heads, birthDate, now }: { heads: HeadCircumference[]; birthDate: string; now: Date }) {
  const { rings, centre } = headRings(heads, birthDate, now);
  const largest = RINGS_HEIGHT * RING_MAX;
  return (
    <Panel className="items-center justify-center overflow-hidden" label="Head circumference rings">
      <View style={{ height: RINGS_HEIGHT }} className="w-full items-center justify-center">
        {rings.map((ring, i) => {
          const size = ring.size * largest;
          return (
            <View
              key={i}
              aria-hidden
              className="absolute rounded-full border-grow-ink"
              style={{ width: size, height: size, borderWidth: ring.latest ? 4 : 2, opacity: ring.fade }}
            />
          );
        })}
        {centre && (
          <View className="items-center">
            <Text className="text-caption font-extrabold text-muted">{centre.label}</Text>
            <Text className="text-lg font-display">{centre.value}</Text>
          </View>
        )}
      </View>
    </Panel>
  );
}

const BARS_HEIGHT = 200;

/** BMI (1f): weight ÷ height² when both were measured that day, and bars for the newest six. */
export function BmiView({ lists, birthDate }: { lists: MeasurementLists; birthDate: string }) {
  const formula = bmiFormula(lists);
  const bars = bmiBars(lists.bmi ?? [], birthDate);
  return (
    <>
      {formula && (
        <View accessible accessibilityLabel={`${formula.weight} divided by ${formula.height} squared`} className="flex-row items-center gap-2.5 rounded-card bg-grow-bg p-4">
          {[
            [formula.weight, 'weight'],
            [formula.height, 'height²'],
          ].map(([value, caption], i) => (
            <Fragment key={caption}>
              {i === 1 && <Text className="text-xl font-display text-grow-ink">÷</Text>}
              <View className="flex-1 items-center rounded-[14px] bg-surface py-2.5">
                <Text className="text-[22px] font-display text-grow-ink">{value}</Text>
                <Text className="text-xs font-extrabold text-grow-ink">{caption}</Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}
      {bars.length > 0 && (
        <Panel className="gap-2 px-4 pb-3 pt-4" label="BMI bars">
          <View className="flex-row items-end gap-2.5" style={{ height: BARS_HEIGHT }}>
            {bars.map((bar, i) => (
              <View key={i} accessible accessibilityLabel={`${bar.label}, ${bar.value}`} className="h-full flex-1 items-center justify-end gap-1.5">
                <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-caption font-display">
                  {bar.value}
                </Text>
                <View
                  className={`w-full rounded-b-[4px] rounded-t-[8px] ${bar.latest ? 'bg-grow-ink' : 'bg-grow-mid'}`}
                  style={{ height: Math.max(4, bar.height * (BARS_HEIGHT - 26)) }}
                />
              </View>
            ))}
          </View>
          <View className="flex-row gap-2.5">
            {bars.map((bar, i) => (
              <Text key={i} maxFontSizeMultiplier={FIXED_SCALE} aria-hidden className="flex-1 text-center text-xs font-extrabold text-muted">
                {bar.label}
              </Text>
            ))}
          </View>
        </Panel>
      )}
    </>
  );
}
