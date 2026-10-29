import type { MeasurementKind } from '@molly/api';
import {
  clockText,
  dayMonth,
  lastMeasurementText,
  MEASUREMENT_STEPS,
  measurementParts,
  newestMeasurements,
  sheetStart,
  stepHint,
  stepMeasurement,
  typedMeasurement,
  type MeasurementLists,
} from '@molly/core';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { FIXED_SCALE, Segment, Spinner, Text } from '@/components/ui';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { useTheme } from '@/theme/theme';

import { entryDay, measureOf, newMeasurement, type DayChoice } from './model';
import { useLogMeasurement } from './queries';

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * One sheet for all five measurements (design `1g`): a stepper from the last value (tap the value to type
 * one), the day, a temperature's time too, notes, and Save. Saved optimistically; closes once Baby Buddy has it.
 */
export function MeasurementSheet({
  kind,
  childId,
  lists,
  now,
  onClose,
}: {
  kind: MeasurementKind;
  childId: number;
  lists: MeasurementLists;
  now: Date;
  onClose: () => void;
}) {
  const measure = measureOf(kind);
  const save = useLogMeasurement(childId);
  const haptic = useHaptic();
  const { palette } = useTheme();
  const [start] = useState(() => sheetStart(kind, lists, now));
  const [value, setValue] = useState(start);
  const [typed, setTyped] = useState<string | null>(null);
  const [choice, setChoice] = useState<DayChoice>('today');
  const [picked, setPicked] = useState<Date | null>(null);
  const [picking, setPicking] = useState(false);
  const [clock, setClock] = useState(() => clockText(now));
  const [clockTyped, setClockTyped] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const latest = newestMeasurements(kind, (lists[kind] ?? []) as never[])[0];
  const typedValue = typed === null ? null : typedMeasurement(kind, typed);
  const day = choice === 'today' ? 'today' : entryDay(choice, picked, now);
  const entry = newMeasurement(kind, { child: childId, value, day, clock, notes }, now);
  const problem =
    typedValue === 'outOfRange' ? 'That value is out of range' : entry === 'future' ? "That time hasn't come yet" : null;
  const { number, unit } = measurementParts(kind, value);

  function step(direction: 1 | -1) {
    haptic(HAPTICS.step);
    setTyped(null);
    setValue((current) => stepMeasurement(kind, current, direction));
  }

  async function submit() {
    if (problem || entry === 'future') return haptic(HAPTICS.armDelete);
    if (saving) return;
    setSaving(true);
    haptic(HAPTICS.log);
    const saved = await save(kind, entry);
    setSaving(false);
    if (saved) onClose();
  }

  const stepper = (direction: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${direction > 0 ? 'Up' : 'Down'} ${measurementParts(kind, MEASUREMENT_STEPS[kind]).number} ${unit}`.trim()}
      onPress={() => step(direction)}
      className="h-16 w-16 items-center justify-center rounded-[20px] bg-grow-bg active:scale-[0.97]"
    >
      <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-[30px] font-display text-grow-ink">
        {direction > 0 ? '+' : '−'}
      </Text>
    </Pressable>
  );

  return (
    <Sheet label={measure.title} title={measure.title} onScrimPress={onClose}>
      {latest && (
        <Text className="-mt-2 px-1 text-caption font-bold text-muted">{lastMeasurementText(kind, latest, now)}</Text>
      )}

      <View className="flex-row items-center gap-3">
        {stepper(-1)}
        <View className="flex-1 items-center">
          <View className="flex-row items-baseline gap-1.5">
            <TextInput
              testID="measurement-value"
              maxFontSizeMultiplier={FIXED_SCALE}
              accessibilityLabel={`${measure.name}${unit ? ` in ${unit === '°C' ? 'degrees' : unit === 'g' ? 'grams' : 'centimetres'}` : ''}`}
              accessibilityHint="Type a value"
              value={typed ?? number}
              onChangeText={(text) => {
                setTyped(text);
                const next = typedMeasurement(kind, text);
                if (typeof next === 'number') setValue(next);
              }}
              onBlur={() => setTyped(null)}
              keyboardType={kind === 'weight' ? 'number-pad' : 'decimal-pad'}
              selectTextOnFocus
              underlineColorAndroid="transparent"
              placeholderTextColor={palette.muted}
              className="min-w-[96px] p-0 text-center font-display text-[52px] leading-[56px] tracking-display-2 text-ink"
              style={{ fontVariant: ['tabular-nums'] }}
            />
            {unit !== '' && (
              <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-xl font-display">
                {unit}
              </Text>
            )}
          </View>
          <Text accessibilityLiveRegion="polite" className={`text-caption font-extrabold ${problem ? 'text-danger' : 'text-grow-ink'}`}>
            {problem ?? stepHint(kind, start, value)}
          </Text>
        </View>
        {stepper(1)}
      </View>

      <Segment
        label="Day"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'yesterday', label: 'Yesterday' },
          { value: 'picked', label: choice === 'picked' && picked ? dayMonth(picked, now) : 'Pick date' },
        ]}
        value={choice}
        onChange={(next) => {
          setChoice(next);
          if (next === 'picked') setPicking(true);
        }}
      />
      {(Platform.OS !== 'web' || choice === 'picked') && (
        <DateField
          value={picked}
          max={now}
          open={picking}
          onChange={(date) => {
            setPicked(date);
            setChoice('picked');
            setPicking(false);
          }}
          onCancel={() => {
            setPicking(false);
            if (!picked) setChoice('today');
          }}
        />
      )}

      {kind === 'temperature' && (
        <View className="flex-row items-center gap-2">
          <Text className="w-12 text-sm font-extrabold text-muted">Time</Text>
          <TextInput
            maxFontSizeMultiplier={FIXED_SCALE}
            accessibilityLabel="Time"
            value={clockTyped ?? clock}
            onChangeText={(text) => {
              setClockTyped(text);
              if (CLOCK.test(text)) setClock(text);
            }}
            onBlur={() => setClockTyped(null)}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            selectTextOnFocus
            className="min-h-[48px] min-w-0 flex-1 rounded-chip border border-line bg-bg px-2.5 py-0 font-display text-[22px] text-ink"
          />
        </View>
      )}

      <TextInput
        accessibilityLabel="Notes"
        value={notes}
        placeholder="Notes"
        placeholderTextColor={palette.muted}
        onChangeText={setNotes}
        className="h-12 rounded-chip border border-line bg-bg px-3.5 font-sans text-base font-bold text-ink"
      />

      <Pressable
        accessibilityRole="button"
        aria-disabled={problem !== null}
        accessibilityHint={problem ?? undefined}
        aria-busy={saving}
        disabled={saving}
        logName={measure.save}
        onPress={() => void submit()}
        className={`h-14 flex-row items-center justify-center gap-2 rounded-button bg-accent shadow-button active:scale-[0.97] ${problem ? 'opacity-40' : ''}`}
      >
        {saving && <Spinner color="on-accent" />}
        <Text className="text-title font-display text-on-accent">{saving ? 'Saving…' : measure.save}</Text>
      </Pressable>
    </Sheet>
  );
}
