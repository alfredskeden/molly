import { clockText, type BottleDefaults } from '@molly/core';
import { useReducer, useState, type ReactNode } from 'react';
import { TextInput, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { FIXED_SCALE, Segment, Spinner, Text } from '@/components/ui';
import { amountInput, startAmount } from '@/features/feed/amount-input';
import { BottleAmount } from '@/features/feed/BottleAmount';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { Glyph } from '@/theme/Glyph';
import { TrackerIcon } from '@/theme/TrackerIcon';
import type { FilledSymbol } from '@/theme/symbols';
import { useTheme } from '@/theme/theme';

import { addProblem, addSummary, hasRange, newDraft, parseClock, withEnd, type AddDraft, type AddKind } from './add-model';

const TYPES: { kind: AddKind; label: string; icon: FilledSymbol }[] = [
  { kind: 'sleep', label: 'Sleep', icon: 'bedtime' },
  { kind: 'feed', label: 'Feed', icon: 'breastfeeding' },
  { kind: 'diaper', label: 'Diaper', icon: 'baby_changing_station' },
  { kind: 'med', label: 'Medicine', icon: 'medication' },
];

// Full class names, spelled out so Tailwind finds them.
const KIND = {
  sleep: { picked: 'border-sleep-mid bg-sleep-bg', ink: 'text-sleep-ink', solid: 'bg-sleep-ink', onSolid: 'text-sleep-bg', glyph: 'sleep-ink', on: 'sleep-bg' },
  feed: { picked: 'border-feed-mid bg-feed-bg', ink: 'text-feed-ink', solid: 'bg-feed-ink', onSolid: 'text-feed-bg', glyph: 'feed-ink', on: 'feed-bg' },
  diaper: { picked: 'border-diaper-mid bg-diaper-bg', ink: 'text-diaper-ink', solid: 'bg-diaper-ink', onSolid: 'text-diaper-bg', glyph: 'diaper-ink', on: 'diaper-bg' },
  med: { picked: 'border-med-mid bg-med-bg', ink: 'text-med-ink', solid: 'bg-med-ink', onSolid: 'text-med-bg', glyph: 'med-ink', on: 'med-bg' },
} as const;
const TONE = { sleep: 'sleep', feed: 'feed', diaper: 'diaper', med: 'med' } as const;

const NUDGE_MS = 5 * 60_000;

/**
 * The `+` button's sheet (design `1j`): any kind of entry at any time. A sleep or feed with no end starts
 * its timer from the start; everything else is saved finished. Save waits for Baby Buddy (`pending`).
 */
export function AddSheet({
  now,
  bottle,
  pending,
  onSave,
  onClose,
}: {
  now: Date;
  /** The last bottle: a finished bottle's amount row starts at its amount. */
  bottle: BottleDefaults;
  pending: boolean;
  onSave: (draft: AddDraft) => void;
  onClose: () => void;
}) {
  const [form, setDraft] = useState(() => newDraft('sleep', now));
  const [amount, dispatchAmount] = useReducer(amountInput, bottle.amount ?? null, startAmount);
  const draft = { ...form, amount: amount.amount };
  const haptic = useHaptic();
  const set = (changes: Partial<AddDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const range = hasRange(draft.kind);
  const problem = addProblem(draft, now);
  const summary = addSummary(draft, now);
  const kind = KIND[draft.kind];
  const kinds =
    draft.kind === 'feed' && draft.end
      ? { label: 'Feed kind', value: draft.feed, options: ['Left', 'Right', 'Both', 'Bottle'] as const, set: (feed: string) => set({ feed: feed as AddDraft['feed'] }) }
      : draft.kind === 'diaper'
        ? { label: 'Diaper kind', value: draft.diaper, options: ['Wet', 'Dirty', 'Both'] as const, set: (diaper: string) => set({ diaper: diaper as AddDraft['diaper'] }) }
        : draft.kind === 'med'
          ? { label: 'Medicine', value: draft.med, options: ['Vitamin D', 'Other'] as const, set: (med: string) => set({ med: med as AddDraft['med'] }) }
          : null;
  const other = draft.kind === 'med' && draft.med === 'Other';

  return (
    <Sheet label="New entry" title="Add entry" onScrimPress={onClose}>
      <View role="radiogroup" accessibilityLabel="Kind of entry" className="-mt-1.5 flex-row gap-2">
        {TYPES.map((type) => {
          const picked = type.kind === draft.kind;
          const colours = KIND[type.kind];
          return (
            <Pressable
              key={type.kind}
              role="radio"
              aria-checked={picked}
              accessibilityLabel={type.label}
              onPress={() => {
                haptic(HAPTICS.choose);
                set({ kind: type.kind, end: hasRange(type.kind) ? draft.end : null, note: '' });
              }}
              className={`min-h-[72px] flex-1 items-center justify-center gap-0.5 rounded-box border-2 py-1 ${picked ? colours.picked : 'border-transparent bg-bg active:bg-line'}`}
            >
              <TrackerIcon name={type.icon} size={26} ribbonSize={32} color={picked ? colours.glyph : 'ink'} light={picked ? colours.on : 'bg'} />
              <Text maxFontSizeMultiplier={FIXED_SCALE} numberOfLines={1} className={`text-caption font-extrabold ${picked ? colours.ink : ''}`}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TimeRow
        label={range ? 'Start' : 'Time'}
        value={draft.start}
        now={now}
        onChange={(start) => set({ start })}
        after={
          <>
            <StepButton label="−5" spoken={`${range ? 'Start' : 'Time'} 5 minutes earlier`} onPress={() => set({ start: new Date(draft.start.getTime() - NUDGE_MS) })} />
            <StepButton label="+5" spoken={`${range ? 'Start' : 'Time'} 5 minutes later`} onPress={() => set({ start: new Date(draft.start.getTime() + NUDGE_MS) })} />
          </>
        }
      />

      {range &&
        (draft.end ? (
          <TimeRow
            label="End"
            value={draft.end}
            now={now}
            onChange={(end) => set({ end })}
            after={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="No end"
                onPress={() => set({ end: null })}
                className="h-[52px] w-28 flex-row items-center justify-center gap-1 rounded-chip bg-bg active:opacity-70"
              >
                <Glyph name="close" size={18} color="muted" />
                <Text className="text-sm font-extrabold text-muted">No end</Text>
              </Pressable>
            }
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => set(withEnd(draft, now))}
            className="h-[52px] flex-row items-center justify-center gap-1.5 rounded-chip border-2 border-dashed border-line active:opacity-70"
          >
            <Glyph name="add" size={20} color="muted" />
            <Text className="text-label font-extrabold text-muted">Add end time</Text>
          </Pressable>
        ))}

      {kinds && <Segment label={kinds.label} options={kinds.options.map((value) => ({ value, label: value }))} value={kinds.value} onChange={kinds.set} tone={TONE[draft.kind]} />}

      {draft.kind === 'feed' && draft.end && draft.feed === 'Bottle' && <BottleAmount state={amount} dispatch={dispatchAmount} />}

      {draft.kind === 'med' && (
        <View className="gap-1.5">
          <Text className="px-1 text-sm font-extrabold text-muted">{other ? 'What was given' : 'Note (optional)'}</Text>
          <NoteInput
            label={other ? 'What was given' : 'Note (optional)'}
            value={draft.note}
            placeholder={other ? 'e.g. Paracetamol 2.5 ml' : 'e.g. given with the morning feed'}
            onChange={(note) => set({ note })}
          />
        </View>
      )}

      <Text accessibilityLiveRegion="polite" className={`px-1 text-caption font-bold ${problem ? 'text-danger' : 'text-muted'}`}>
        {problem ?? summary.note}
      </Text>

      <Pressable
        accessibilityRole="button"
        aria-disabled={problem !== null}
        // The reason it's dimmed, for TalkBack on the button itself (the live region says it once).
        accessibilityHint={problem ?? undefined}
        aria-busy={pending}
        disabled={pending}
        logName={summary.button}
        onPress={() => {
          if (problem) return haptic(HAPTICS.armDelete);
          onSave(draft);
        }}
        className={`h-[58px] flex-row items-center justify-center gap-2 rounded-button shadow-button active:scale-[0.98] ${kind.solid} ${problem ? 'opacity-40' : ''}`}
      >
        {pending ? (
          <Spinner color={kind.on} />
        ) : (
          <Glyph name={summary.timer ? 'play_arrow' : 'check'} filled size={22} color={kind.on} />
        )}
        <Text className={`text-title font-display ${kind.onSolid}`}>{pending ? 'Saving…' : summary.button}</Text>
      </Pressable>
    </Sheet>
  );
}

/** A clock time typed as `10:50`, read as the latest such time not in the future. */
function TimeRow({
  label,
  value,
  now,
  onChange,
  after,
}: {
  label: string;
  value: Date;
  now: Date;
  onChange: (time: Date) => void;
  after: ReactNode;
}) {
  const { palette } = useTheme();
  // What's typed, until it's a time; the draft's own time otherwise.
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <View className="flex-row items-center gap-2">
      <Text maxFontSizeMultiplier={FIXED_SCALE} numberOfLines={1} className="w-12 text-sm font-extrabold text-muted">
        {label}
      </Text>
      <TextInput
        maxFontSizeMultiplier={FIXED_SCALE}
        accessibilityLabel={label}
        value={typed ?? clockText(value)}
        onChangeText={(text) => {
          setTyped(text);
          const time = parseClock(text, now);
          if (time) onChange(time);
        }}
        onBlur={() => setTyped(null)}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        selectTextOnFocus
        placeholderTextColor={palette.muted}
        className="min-h-[52px] min-w-0 flex-1 rounded-chip border border-line bg-bg px-2.5 py-0 font-display text-[26px] text-ink"
      />
      {after}
    </View>
  );
}

function NoteInput({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (text: string) => void }) {
  const { palette } = useTheme();
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={palette.muted}
      onChangeText={onChange}
      className="h-[52px] rounded-chip border border-line bg-bg px-3.5 font-sans text-title font-bold text-ink"
    />
  );
}

function StepButton({ label, spoken, onPress }: { label: string; spoken: string; onPress: () => void }) {
  const haptic = useHaptic();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={() => {
        haptic(HAPTICS.step);
        onPress();
      }}
      className="h-[52px] w-[52px] items-center justify-center rounded-chip bg-bg active:scale-[0.97]"
    >
      <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-label font-display">
        {label}
      </Text>
    </Pressable>
  );
}
