import type { Child, FeedingType, MeasurementKind } from '@molly/api';
import { ageLabel, shownChildren, type ChildPrefs, type Sex } from '@molly/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationLine } from '@/components/notification-line';
import { Pressable } from '@/components/pressable';
import { BehindSheet } from '@/components/sheet';
import { BackLink, Banner, Panel, SaveBar, Segment, StepperRow, Text, ToggleRow } from '@/components/ui';
import { Avatar, childBg } from '@/features/children/Avatar';
import { useChildrenOnScreen, useSetChildPrefs } from '@/features/children/use-children';
import { useSettings } from '@/features/dashboard/queries';
import { DevelopmentCard } from '@/features/development/DevelopmentCard';
import { useNow } from '@/features/dashboard/use-now';
import { MeasurementSheet } from '@/features/measurements/MeasurementSheet';
import { MeasurementsCard } from '@/features/measurements/MeasurementsCard';
import { useMeasurements } from '@/features/measurements/queries';
import { useUnsavedToast } from '@/features/settings/unsaved';
import { useToast } from '@/features/toast/toast';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { notificationCardLine } from '@/notification/model';
import { hasNotifications } from '@/notification/sync';
import { useNotificationState } from '@/notification/use-state';
import { DEFAULT_SETTINGS } from '@/storage/types';
import { Glyph } from '@/theme/Glyph';
import { syncWidget } from '@/widget/sync';

/** The swatches in the design's order (hues 285, 350, 210, 165, 60), as indices into the child colours. */
const SWATCHES = [4, 0, 1, 2, 3];
/** Plain names for the child colours, by index, for screen readers (the swatches show them). */
const COLOUR_NAMES = ['Rose', 'Sky', 'Mint', 'Sand', 'Lavender'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** `3 March 2026` from Baby Buddy's `2026-03-03`. */
function bornOn(birthDate: string) {
  const [year, month = 1, day] = birthDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

const SEXES: { value: Sex | 'unset'; label: string }[] = [
  { value: 'unset', label: 'Not set' },
  { value: 'girl', label: 'Girl' },
  { value: 'boy', label: 'Boy' },
];

const BOTTLES: { value: FeedingType; label: string }[] = [
  { value: 'breast milk', label: 'Breast milk' },
  { value: 'formula', label: 'Formula' },
];

/** `07:00` moved by `minutes`, wrapping round midnight. */
function shiftClock(clock: string, minutes: number): string {
  const [hours = 0, mins = 0] = clock.split(':').map(Number);
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Back to Settings, as its label says: popped when it's underneath, put there after a reload (the dashboard under it). */
const back = () => router.dismissTo('/settings');

/** One child's own settings on this device (design `1i`). Name and birth date stay in Baby Buddy. */
export default function ChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { all, prefsOf, loaded } = useChildrenOnScreen();
  const settings = useSettings().data;
  const child = all.find((candidate) => String(candidate.id) === id);
  if (!loaded || !settings) return null;
  if (!child) {
    return (
      <View className="flex-1 bg-bg pt-8">
        <BackLink label="Settings" onPress={back} />
        <View className="px-4">
          <Banner text="This child isn't in Baby Buddy any more." tone="error" />
        </View>
      </View>
    );
  }
  // Keyed: another child's screen starts from that child's values.
  return <ChildForm key={child.id} child={child} prefs={prefsOf(child.id)} all={all} />;
}

function ChildForm({ child, prefs, all }: { child: Child; prefs: ChildPrefs; all: Child[] }) {
  const setChildPrefs = useSetChildPrefs();
  const settings = useSettings().data ?? DEFAULT_SETTINGS;
  const now = useNow();
  const haptic = useHaptic();
  const toast = useToast();
  const notifications = useNotificationState();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(prefs);
  const [saving, setSaving] = useState(false);
  const measurements = useMeasurements(child.id);
  const [adding, setAdding] = useState<MeasurementKind | null>(null);
  const set = (changes: Partial<ChildPrefs>) => setDraft((current) => ({ ...current, ...changes }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(prefs);
  useUnsavedToast(dirty, 'Changes not saved');
  // The last shown child stays shown: Molly always has someone on screen.
  const lastShown = prefs.shown && shownChildren(all, settings.children).length === 1;
  const amount = draft.bottle.amount ?? 0;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await setChildPrefs(child.id, draft);
      if (draft.vitaminDReminder && !prefs.vitaminDReminder && notifications.state === 'off') await notifications.turnOn();
      await syncWidget();
      toast({ text: `${child.first_name}'s settings saved`, tone: 'diaper' });
    } finally {
      setSaving(false);
    }
  }

  async function turnOn() {
    if ((await notifications.turnOn()) === 'granted') await syncWidget();
  }

  const reminderLine = notificationCardLine({
    enabled: false,
    reminder: draft.vitaminDReminder,
    notifications: notifications.state,
    liveUpdates: notifications.liveUpdates,
  });

  return (
    <View className="flex-1 bg-bg">
      <BehindSheet sheetOpen={adding !== null}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}>
        <BackLink label="Settings" onPress={back} />
        <View className="flex-row items-center gap-3.5 px-[22px] pb-[18px] pt-1">
          <Avatar name={child.first_name} hue={draft.hue} size={60} square faded={!draft.shown} />
          <View className="shrink">
            <Text role="heading" className="text-[28px] font-display tracking-display-0_5">
              {child.first_name}
            </Text>
            <Text className="text-sm font-bold text-muted">
              {ageLabel(child.birth_date, now)} · born {bornOn(child.birth_date)}
            </Text>
          </View>
        </View>

        <View className="gap-3.5 px-4">
          <DevelopmentCard child={child} now={now} />

          <MeasurementsCard childId={child.id} measurements={measurements} now={now} onAdd={setAdding} />

          <Panel className="px-4">
            <ToggleRow
              title="Show in Molly"
              subtitle={lastShown ? 'At least one child stays shown' : 'Hidden children stay in Baby Buddy'}
              value={draft.shown}
              onChange={(shown) => (lastShown && !shown ? haptic(HAPTICS.armDelete) : set({ shown }))}
              last
            />
          </Panel>

          <Panel className="gap-3 px-4 pb-4 pt-3.5">
            <Text className="text-base font-display">Colour</Text>
            <View role="radiogroup" accessibilityLabel="Colour" className="flex-row gap-2.5">
              {SWATCHES.map((hue) => {
                const chosen = hue === draft.hue;
                return (
                  <Pressable
                    key={hue}
                    role="radio"
                    aria-checked={chosen}
                    accessibilityLabel={COLOUR_NAMES[hue]}
                    onPress={() => {
                      haptic(HAPTICS.choose);
                      set({ hue });
                    }}
                    className={`h-12 w-12 items-center justify-center rounded-full active:scale-[0.97] ${childBg(hue)} ${chosen ? 'border-[3px] border-ink' : ''}`}
                  >
                    {chosen && <Glyph name="check" size={22} color="ink" />}
                  </Pressable>
                );
              })}
            </View>
          </Panel>

          <Panel className="gap-3 px-4 pb-4 pt-3.5">
            <View>
              <Text className="text-base font-display">Girl or boy</Text>
              <Text className="text-caption font-bold text-muted">Picks the WHO weight ranges. Only on this phone.</Text>
            </View>
            <Segment small label="Girl or boy" options={SEXES} value={draft.sex ?? 'unset'} onChange={(sex) => set({ sex: sex === 'unset' ? null : sex })} />
          </Panel>

          <Panel className="gap-3 px-4 pb-4 pt-3.5">
            <View>
              <Text className="text-base font-display">Day and night</Text>
              <Text className="text-caption font-bold text-muted">
                Naps start in the day. The day starts at the wake-up closest to the start time.
              </Text>
            </View>
            {(['start', 'end'] as const).map((edge) => {
              const label = edge === 'start' ? 'Day starts' : 'Day ends';
              const step = (minutes: number) => () => set({ napWindow: { ...draft.napWindow, [edge]: shiftClock(draft.napWindow[edge], minutes) } });
              return (
                <StepperRow
                  key={edge}
                  label={label}
                  value={draft.napWindow[edge]}
                  labelWidth={76}
                  minusLabel="−15"
                  plusLabel="+15"
                  spokenMinus={`${label} 15 minutes earlier`}
                  spokenPlus={`${label} 15 minutes later`}
                  onMinus={step(-15)}
                  onPlus={step(15)}
                />
              );
            })}
          </Panel>

          <Panel className="gap-3 px-4 pb-4 pt-3.5">
            <Text className="text-base font-display">Bottle</Text>
            <Segment small label="Bottle" options={BOTTLES} value={draft.bottle.type} onChange={(type) => set({ bottle: { ...draft.bottle, type } })} />
            <StepperRow
              label="Amount"
              value={`${amount} ml`}
              labelWidth={76}
              minusLabel="−10"
              plusLabel="+10"
              spokenMinus="Amount 10 ml less"
              spokenPlus="Amount 10 ml more"
              onMinus={() => set({ bottle: amount - 10 > 0 ? { ...draft.bottle, amount: amount - 10 } : { type: draft.bottle.type } })}
              onPlus={() => set({ bottle: { ...draft.bottle, amount: amount + 10 } })}
            />
          </Panel>

          <Panel className="px-4">
            <ToggleRow
              title="Solid food"
              subtitle="Adds Solids to Feed"
              value={draft.solids}
              onChange={(solids) => set({ solids })}
              last={!hasNotifications}
            />
            {hasNotifications && (
              <ToggleRow
                title="Vitamin D reminder"
                subtitle="After a sleep this phone stops, if no dose is logged that day"
                value={draft.vitaminDReminder}
                onChange={(vitaminDReminder) => set({ vitaminDReminder })}
                last
              >
                {reminderLine && <NotificationLine line={reminderLine} onTurnOn={turnOn} />}
              </ToggleRow>
            )}
          </Panel>

          <Text className="mt-2 px-1 text-center text-caption font-bold text-muted">Name and birth date come from Baby Buddy.</Text>
        </View>
      </ScrollView>
      <SaveBar dirty={dirty} onSave={save} pending={saving} />
      </BehindSheet>
      {adding && (
        <MeasurementSheet kind={adding} childId={child.id} lists={measurements.lists} now={now} onClose={() => setAdding(null)} />
      )}
    </View>
  );
}
