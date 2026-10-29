import { clockText, labelFor, shortDate, type TodoItem } from '@molly/core';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Keyboard, Platform, TextInput, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { TimeField } from '@/components/TimeField';
import { FIXED_SCALE, Segment, Spinner, StepButton, Text, ToggleRow } from '@/components/ui';
import { useUnsavedOnReturn } from '@/features/return/ReturnProvider';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { hasNotifications } from '@/notification/sync';
import { Glyph } from '@/theme/Glyph';
import type { OutlinedSymbol } from '@/theme/symbols';
import { useTheme } from '@/theme/theme';

import { PHOTO_SOURCES, pickPhoto, type PhotoSource, type PickedPhoto } from './photo';
import {
  draftDue,
  newTodoDraft,
  pickDay,
  pickTime,
  reminderLine,
  stepDay,
  stepTime,
  todoChanged,
  todoDraftOf,
  type TodoDay,
  type TodoDraftState,
} from './sheet-model';
import type { TodoSave } from './use-todo-writes';

const DAYS: { value: TodoDay; label: string }[] = [
  { value: 'none', label: 'No date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'other', label: 'Other' },
];

const TIMES = [
  { value: 'any', label: 'Any time' },
  { value: 'at', label: 'At a time' },
] as const;

const SOURCES: Record<PhotoSource, { label: string; icon: OutlinedSymbol }> = {
  camera: { label: 'Camera', icon: 'photo_camera' },
  library: { label: PHOTO_SOURCES.length > 1 ? 'Library' : 'Choose a photo', icon: 'photo_library' },
};

/** The photo in the sheet: as saved, a new one picked here, or removed. */
type PhotoDraft = { kind: 'keep' } | { kind: 'new'; photo: PickedPhoto } | { kind: 'remove' };

/**
 * Adds or edits a to-do item: text (keyboard open), label chips, date, time, the Android "Remind me" switch
 * (this phone only; its line says when) and a photo. The Other day and the time open the system date / clock
 * dialog on Android (closing the keyboard first) and are the browser's date / time fields on the web; the
 * steppers beside them nudge. A new label is only made on Save, with the item. No Delete: parents can't delete
 * notes. `labels` null: no `core.view_tag`, so only the built-in labels, with a hint. `quiet`: this phone's
 * `todoQuiet` ids.
 */
export function TodoSheet({
  item,
  photo,
  labels,
  quiet,
  now,
  onSave,
  onClose,
}: {
  item: TodoItem | null;
  /** The item's photo URL (`photoUrl`), if it has one. */
  photo: string | null;
  labels: string[] | null;
  quiet: readonly number[];
  now: Date;
  onSave: (save: TodoSave) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TodoDraftState>(() => (item ? todoDraftOf(item, now, quiet) : newTodoDraft(null, now)));
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>({ kind: 'keep' });
  const [added, setAdded] = useState<string[]>([]);
  const [naming, setNaming] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);
  const [opened] = useState(draft);
  useUnsavedOnReturn(todoChanged(opened, draft, { photo: photoDraft.kind, added }));
  const { palette } = useTheme();
  const haptic = useHaptic();
  const set = (changes: Partial<TodoDraftState>) => setDraft((current) => ({ ...current, ...changes }));

  const offered = [...(labels ?? ['Buy', 'Appointments']), ...added];
  // An edited item's label stays offered even if the tags list doesn't have it (yet).
  const chips = draft.label && !offered.includes(draft.label) ? [...offered, draft.label] : offered;
  const due = draftDue(draft, now);
  const reminder = hasNotifications ? reminderLine({ due, quiet: draft.quiet }, now) : null;
  const blank = draft.text.trim() === '';
  const shownPhoto = photoDraft.kind === 'new' ? photoDraft.photo.uri : photoDraft.kind === 'keep' ? photo : null;

  function openPicker(which: 'date' | 'time') {
    Keyboard.dismiss();
    setPicking(which);
  }

  function addLabel() {
    const label = naming === null ? null : labelFor(naming, chips);
    if (!label) return haptic(HAPTICS.armDelete);
    if (!chips.includes(label)) setAdded((current) => [...current, label]);
    set({ label });
    setNaming(null);
  }

  async function choose(source: PhotoSource) {
    const picked = await pickPhoto(source).catch((error: unknown) => {
      console.warn('Molly photo', error);
      return null;
    });
    if (picked) setPhotoDraft({ kind: 'new', photo: picked });
  }

  async function save() {
    if (blank || saving) return;
    setSaving(true);
    const image = photoDraft.kind === 'new' ? photoDraft.photo.image : photoDraft.kind === 'remove' ? null : undefined;
    const saved = await onSave({ text: draft.text.trim(), label: draft.label, due, image, quiet: draft.quiet });
    setSaving(false);
    if (saved) onClose();
  }

  return (
    <Sheet label={item ? 'Edit item' : 'New item'} title={item ? 'Edit item' : 'New item'} onScrimPress={onClose} scroll>
      <View className="gap-4">
        <TextInput
          accessibilityLabel="What needs doing"
          autoFocus={!item}
          value={draft.text}
          onChangeText={(text) => set({ text })}
          placeholder="e.g. Diapers size 3"
          placeholderTextColor={palette.muted}
          returnKeyType="done"
          className="min-h-[52px] rounded-chip border border-line bg-bg px-3.5 font-sans text-title font-bold text-ink"
        />

        <View className="gap-1.5">
          <Text className="px-1 text-sm font-extrabold text-muted">Label</Text>
          <View role="radiogroup" accessibilityLabel="Label" className="flex-row flex-wrap gap-2">
            {chips.map((label) => (
              <Chip
                key={label}
                label={label}
                chosen={draft.label === label}
                onPress={() => {
                  haptic(HAPTICS.choose);
                  set({ label: draft.label === label ? null : label });
                }}
              />
            ))}
            {labels && naming === null && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setNaming('')}
                className="min-h-12 flex-row items-center gap-1 rounded-full border-2 border-dashed border-line px-3.5 active:opacity-70"
              >
                <Glyph name="add" size={18} color="muted" />
                <Text className="text-label font-extrabold text-muted">New label</Text>
              </Pressable>
            )}
          </View>
          {naming !== null && (
            <View className="flex-row items-center gap-2">
              <TextInput
                accessibilityLabel="New label"
                autoFocus
                value={naming}
                onChangeText={setNaming}
                onSubmitEditing={addLabel}
                placeholder="e.g. Pharmacy"
                placeholderTextColor={palette.muted}
                returnKeyType="done"
                className="h-12 min-w-0 flex-1 rounded-chip border border-line bg-bg px-3.5 font-sans text-label font-bold text-ink"
              />
              <Pressable accessibilityRole="button" onPress={addLabel} className="h-12 justify-center rounded-chip bg-bg px-4 active:opacity-70">
                <Text className="text-label font-extrabold">Add</Text>
              </Pressable>
            </View>
          )}
          <Text className="px-1 text-caption font-bold text-muted">
            {labels
              ? 'No label puts it under Other.'
              : 'Your Baby Buddy user needs core.view_tag to see the family’s own labels.'}
          </Text>
        </View>

        <View className="gap-1.5">
          <Text className="px-1 text-sm font-extrabold text-muted">Date</Text>
          <Segment label="Date" options={DAYS} value={draft.day} onChange={(day) => set({ day })} small />
          {draft.day === 'other' && (
            <View className="flex-row items-center gap-2">
              <PickedValue text={shortDate(draft.other)} spoken={`Due date ${shortDate(draft.other)}, pick a date`} onPress={() => openPicker('date')}>
                <DateField
                  value={draft.other}
                  min={new Date(now.getFullYear(), now.getMonth(), now.getDate())}
                  label="Due date"
                  open={picking === 'date'}
                  onChange={(day) => {
                    setDraft((current) => pickDay(current, day, now));
                    setPicking(null);
                  }}
                  onCancel={() => setPicking(null)}
                />
              </PickedValue>
              <StepButton label="−1 d" spoken="A day earlier" onPress={() => setDraft((current) => stepDay(current, -1, now))} />
              <StepButton label="+1 d" spoken="A day later" onPress={() => setDraft((current) => stepDay(current, 1, now))} />
            </View>
          )}
          {draft.day !== 'none' && (
            <Segment
              label="Time"
              options={TIMES}
              value={draft.timed ? 'at' : 'any'}
              onChange={(time) => set({ timed: time === 'at' })}
              small
            />
          )}
          {draft.day !== 'none' && draft.timed && (
            <View className="flex-row items-center gap-2">
              <PickedValue text={clockText(due!.at)} spoken={`Due time ${clockText(due!.at)}, pick a time`} onPress={() => openPicker('time')}>
                <TimeField
                  value={draft.minutes}
                  label="Due time"
                  open={picking === 'time'}
                  onChange={(minutes) => {
                    setDraft((current) => pickTime(current, minutes));
                    setPicking(null);
                  }}
                  onCancel={() => setPicking(null)}
                />
              </PickedValue>
              <StepButton label="−15" spoken="15 minutes earlier" onPress={() => setDraft((current) => stepTime(current, -15))} />
              <StepButton label="+15" spoken="15 minutes later" onPress={() => setDraft((current) => stepTime(current, 15))} />
            </View>
          )}
          {reminder && (
            <View className="px-1">
              <ToggleRow
                title="Remind me"
                subtitle={reminder}
                value={!draft.quiet}
                onChange={(on) => set({ quiet: !on })}
                last
              />
            </View>
          )}
        </View>

        <View className="gap-1.5">
          <Text className="px-1 text-sm font-extrabold text-muted">Photo</Text>
          {shownPhoto ? (
            <View className="flex-row items-center gap-3">
              <Image
                source={{ uri: shownPhoto }}
                accessibilityLabel="The item's photo"
                contentFit="cover"
                style={{ width: 72, height: 72, borderRadius: 12 }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => choose(PHOTO_SOURCES[PHOTO_SOURCES.length - 1]!)}
                className="h-12 justify-center rounded-chip bg-bg px-4 active:opacity-70"
              >
                <Text className="text-label font-extrabold">Replace</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPhotoDraft(photoDraft.kind === 'new' && !photo ? { kind: 'keep' } : { kind: 'remove' })}
                className="h-12 justify-center px-3 active:opacity-70"
              >
                <Text className="text-label font-extrabold text-danger">Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-2">
              {PHOTO_SOURCES.map((source) => (
                <Pressable
                  key={source}
                  accessibilityRole="button"
                  onPress={() => choose(source)}
                  className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-chip bg-bg active:opacity-70"
                >
                  <Glyph name={SOURCES[source].icon} size={20} color="ink" />
                  <Text className="text-label font-extrabold">{SOURCES[source].label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          aria-busy={saving}
          disabled={saving || blank}
          logName="Save"
          onPress={save}
          className={`h-[58px] flex-row items-center justify-center gap-2 rounded-button bg-accent shadow-button active:scale-[0.98] ${blank ? 'opacity-40' : ''}`}
        >
          {saving ? <Spinner color="on-accent" /> : <Glyph name="check" size={22} color="on-accent" />}
          <Text className="text-title font-display text-on-accent">{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Chip({ label, chosen, onPress }: { label: string; chosen: boolean; onPress: () => void }) {
  return (
    <Pressable
      role="radio"
      aria-checked={chosen}
      onPress={onPress}
      className={`min-h-12 justify-center rounded-full border-2 px-4 ${chosen ? 'border-accent bg-accent' : 'border-line bg-bg active:bg-line'}`}
    >
      <Text maxFontSizeMultiplier={FIXED_SCALE} className={`text-label font-extrabold ${chosen ? 'text-on-accent' : ''}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The Other day or the time: on Android the big value is a button that opens its dialog (`children`, which
 * draw nothing there); on the web the browser's field (`children`) stands in its place.
 */
function PickedValue({ text, spoken, onPress, children }: { text: string; spoken: string; onPress: () => void; children: ReactNode }) {
  if (Platform.OS === 'web') return <View className="flex-1 items-start pl-1">{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={spoken} onPress={onPress} className="flex-1 justify-center self-stretch pl-1 active:opacity-70">
      <Text maxFontSizeMultiplier={FIXED_SCALE} className="font-display text-[26px] tabular-nums">
        {text}
      </Text>
      {children}
    </Pressable>
  );
}
