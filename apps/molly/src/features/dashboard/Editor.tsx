import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { CloseButton, InkButton, Panel, QuietButton, Segment, StepperRow, Text, type Tone } from '@/components/ui';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { TrackerIcon } from '@/theme/TrackerIcon';
import type { FilledSymbol } from '@/theme/symbols';

import type { DraftField } from './editor-model';

export type EditorTone = 'sleep' | 'feed' | 'diaper' | 'med';

const ICON_BOX: Record<EditorTone, { box: string; ink: 'sleep-ink' | 'feed-ink' | 'diaper-ink' | 'med-ink'; bg: 'sleep-bg' | 'feed-bg' | 'diaper-bg' | 'med-bg' }> = {
  sleep: { box: 'bg-sleep-bg', ink: 'sleep-ink', bg: 'sleep-bg' },
  feed: { box: 'bg-feed-bg', ink: 'feed-ink', bg: 'feed-bg' },
  diaper: { box: 'bg-diaper-bg', ink: 'diaper-ink', bg: 'diaper-bg' },
  med: { box: 'bg-med-bg', ink: 'med-ink', bg: 'med-bg' },
};

/** How long the first tap on Delete keeps it armed, so a later stray tap doesn't delete. */
const DELETE_ARMED_MS = 4000;
const NUDGE = 5;

/**
 * The card under the ring for the tapped entry (design `1b`): its kind, length and when, Start / End (or
 * Time) with −5 / +5, the kind's options, Delete and Done. Done saves; the close X drops the changes.
 * Delete asks for a second tap, since it can't be undone.
 */
export function Editor({
  tone,
  icon,
  title,
  sub,
  rows,
  onNudge,
  kinds,
  amount,
  deleteLabel,
  onDelete,
  sending,
  onDone,
  onClose,
}: {
  tone: EditorTone;
  icon: FilledSymbol;
  title: string;
  sub: string;
  rows: { label: string; value: string; field: DraftField }[];
  onNudge: (field: DraftField, minutes: number) => void;
  kinds?: { label: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void };
  /** A bottle's amount, in ml. */
  amount?: { value: number; onStep: (ml: number) => void };
  /** `Delete`, or `Cancel sleep` for the running sleep. */
  deleteLabel: string;
  onDelete: () => void;
  sending: 'save' | 'delete' | null;
  onDone: () => void;
  onClose: () => void;
}) {
  const haptic = useHaptic();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), DELETE_ARMED_MS);
    return () => clearTimeout(timeout);
  }, [armed]);
  const box = ICON_BOX[tone];
  return (
    <Panel className="gap-3.5 px-4 pb-4 pt-3.5" label={`Edit ${title}`}>
      <View className="flex-row items-center gap-3">
        <View className={`h-12 w-12 items-center justify-center rounded-button ${box.box}`}>
          <TrackerIcon name={icon} size={26} ribbonSize={30} color={box.ink} light={box.bg} />
        </View>
        <View className="flex-1">
          <Text role="heading" className="text-lg font-display">
            {title}
          </Text>
          <Text className="text-caption font-bold text-muted">{sub}</Text>
        </View>
        <CloseButton onPress={onClose} label="Close without saving" />
      </View>
      {rows.map((row) => (
        <StepperRow
          key={row.field}
          label={row.label}
          value={row.value}
          big
          minusLabel={`−${NUDGE}`}
          plusLabel={`+${NUDGE}`}
          spokenMinus={`${row.label} ${NUDGE} minutes earlier`}
          spokenPlus={`${row.label} ${NUDGE} minutes later`}
          onMinus={() => onNudge(row.field, -NUDGE)}
          onPlus={() => onNudge(row.field, NUDGE)}
        />
      ))}
      {amount && (
        <StepperRow
          label="Amount"
          value={`${amount.value} ml`}
          big
          minusLabel="−10"
          plusLabel="+10"
          spokenMinus="Less: −10 ml"
          spokenPlus="More: +10 ml"
          onMinus={() => amount.onStep(-10)}
          onPlus={() => amount.onStep(10)}
        />
      )}
      {kinds && <Segment label={kinds.label} options={kinds.options} value={kinds.value} onChange={kinds.onChange} tone={tone as Tone} />}
      <View className="flex-row items-center justify-between gap-3">
        <QuietButton
          danger
          label={sending === 'delete' ? 'Deleting…' : armed ? 'Tap again to delete' : deleteLabel}
          pending={sending === 'delete'}
          onPress={() => {
            if (armed) return onDelete();
            haptic(HAPTICS.armDelete);
            setArmed(true);
            // The label changes silently for a screen reader: say it.
            AccessibilityInfo.announceForAccessibility('Tap again to delete');
          }}
        />
        <InkButton label="Done" onPress={onDone} pending={sending === 'save'} pendingLabel="Saving…" />
      </View>
    </Panel>
  );
}
