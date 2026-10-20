import { ageLabel, type GuideRegion } from '@molly/core';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationLine } from '@/components/notification-line';
import { BehindSheet, Sheet } from '@/components/sheet';
import { BackLink, Button, LinkRow, Panel, SaveBar, ScreenTitle, SectionLabel, Segment, Text, ToggleRow } from '@/components/ui';
import { Avatar } from '@/features/children/Avatar';
import { useChildrenOnScreen } from '@/features/children/use-children';
import { useSettings } from '@/features/dashboard/queries';
import { useNow } from '@/features/dashboard/use-now';
import { useUnsavedToast } from '@/features/settings/unsaved';
import { useToast } from '@/features/toast/toast';
import { hasHaptics } from '@/haptics/play';
import { notificationCardLine } from '@/notification/model';
import { hasNotifications } from '@/notification/sync';
import { useNotificationState } from '@/notification/use-state';
import { useSession, useSignedInSession } from '@/session/session';
import { updateSettings } from '@/storage/settings';
import type { Settings, ThemePreference } from '@/storage/types';
import { Bow, useOrnaments } from '@/theme/Bow';
import { PLAIN, spoken } from '@/theme/copy';
import { Glyph } from '@/theme/Glyph';
import { useCopy, useTheme } from '@/theme/theme';
import { ThemeSheet } from '@/theme/ThemeSheet';
import { THEMES } from '@/theme/themes';
import { canPinWidget, pinWidget, syncWidget } from '@/widget/sync';

export default function SettingsScreen() {
  const settings = useSettings();
  if (!settings.data) return null;
  return <SettingsForm initial={settings.data} />;
}

/** What Save applies: Colours, Guidance and the switches. The theme applies at once from its sheet. */
type Draft = {
  colours: ThemePreference;
  guideRegion: GuideRegion;
  notifications: boolean;
  haptics: boolean;
  playful: boolean;
  feedTimer: boolean;
};

const COLOURS = [
  { value: 'system', label: 'Follow the phone' },
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
] as const;

const GUIDANCE = [
  { value: 'sweden', label: 'Sweden' },
  { value: 'international', label: 'International' },
] as const;

/** Settings (design `1h`): children, then Colours, the switches, Theme and Baby Buddy, with a sticky Save. */
function SettingsForm({ initial }: { initial: Settings }) {
  const theme = useTheme();
  // Life Sim: a green face before its name on the Theme row.
  const simFace = THEMES[theme.look][theme.scheme].needs?.bow ?? null;
  const ornaments = useOrnaments();
  const copy = useCopy();
  const toast = useToast();
  const queryClient = useQueryClient();
  const notifications = useNotificationState();
  const insets = useSafeAreaInsets();
  const { all, prefsOf } = useChildrenOnScreen();
  const saved: Draft = {
    colours: theme.preference,
    guideRegion: initial.guideRegion,
    notifications: initial.notifications,
    haptics: initial.haptics,
    playful: theme.playful,
    feedTimer: initial.feedTimer,
  };
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [askingTheme, setAskingTheme] = useState(false);
  const [askingConnection, setAskingConnection] = useState(false);
  const dirty = (Object.keys(saved) as (keyof Draft)[]).some((key) => draft[key] !== saved[key]);
  const set = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));
  const anyReminder = all.some((child) => prefsOf(child.id).vitaminDReminder);
  useUnsavedToast(dirty, 'Changes not saved');

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      theme.setPreference(draft.colours);
      theme.setPlayful(draft.playful);
      await updateSettings({
        notifications: draft.notifications,
        haptics: draft.haptics,
        guideRegion: draft.guideRegion,
        feedTimer: draft.feedTimer,
      });
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      if (draft.notifications && notifications.state === 'off') await notifications.turnOn();
      await syncWidget();
      toast({ text: 'Settings saved', tone: 'diaper' });
    } finally {
      setSaving(false);
    }
  }

  async function turnOn() {
    if ((await notifications.turnOn()) === 'granted') await syncWidget();
  }

  const line = notificationCardLine({
    enabled: draft.notifications,
    reminder: anyReminder,
    notifications: notifications.state,
    liveUpdates: notifications.liveUpdates,
  });
  // Only a theme with its own words has anything for the switch to do.
  const playfulTheme = theme.look !== 'classic';
  type Toggle = { key: string; title: string; subtitle: string; value: boolean; onChange: (value: boolean) => void; extra?: ReactNode };
  const toggles = ([
    {
      key: 'feedTimer',
      title: 'Time feeds',
      subtitle: 'Start and stop a timer for each feed. Off, one tap saves the feed',
      value: draft.feedTimer,
      onChange: (feedTimer: boolean) => set({ feedTimer }),
    },
    hasNotifications ? {
      key: 'notifications',
      title: 'Notifications',
      subtitle: 'Lock-screen timer while a sleep or feed runs',
      value: draft.notifications,
      onChange: (notifications: boolean) => set({ notifications }),
      extra: line && <NotificationLine line={line} onTurnOn={turnOn} />,
    } : null,
    hasHaptics ? {
      key: 'haptics',
      title: 'Haptics',
      subtitle: 'A tap you can feel for every action',
      value: draft.haptics,
      onChange: (haptics: boolean) => set({ haptics }),
    } : null,
    playfulTheme ? {
      key: 'playful',
      title: 'Playful labels',
      // Life Sim's design names its own words.
      subtitle: THEMES[theme.look][theme.scheme].needs ? 'Theme words like “Code brown”' : 'Off keeps the look with plain words like Sleep and Feed',
      value: draft.playful,
      onChange: (playful: boolean) => set({ playful }),
    } : null,
  ] as (Toggle | null)[]).filter((toggle): toggle is Toggle => toggle !== null);

  return (
    <View className="flex-1 bg-bg">
      <BehindSheet sheetOpen={askingTheme || askingConnection}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}>
          <BackLink />
          {/* Ribbon ties a bow beside the title. */}
          <View className="flex-row items-center">
            <ScreenTitle spoken={spoken(copy.settings, PLAIN.settings)}>{copy.settings}</ScreenTitle>
            {ornaments && (
              <View className="-ml-3 pb-3.5 pt-1">
                <Bow size={34} color={ornaments.bow.color} shade={ornaments.bow.shade} tilt={-8} />
              </View>
            )}
          </View>
          <View className="gap-3.5 px-4">
            <SectionLabel>Children</SectionLabel>
            <ChildrenCard />

            <View className="mt-1">
              <SectionLabel>For everyone</SectionLabel>
            </View>
            <Panel className="gap-2.5 px-4 pb-4 pt-3.5">
              <Text className="text-base font-display">Colours</Text>
              <Segment small label="Colours" options={COLOURS} value={draft.colours} onChange={(colours) => set({ colours })} />
            </Panel>
            <Panel className="gap-2.5 px-4 pb-4 pt-3.5">
              <View className="gap-0.5">
                <Text className="text-base font-display">Guidance</Text>
                <Text className="text-caption font-bold text-muted">
                  Check-ups, vaccines, food advice and who to call in the Development guide
                </Text>
              </View>
              <Segment
                small
                label="Guidance"
                options={GUIDANCE}
                value={draft.guideRegion}
                onChange={(guideRegion) => set({ guideRegion })}
              />
            </Panel>
            <Panel className="px-4">
              {toggles.map((toggle, index) => (
                <ToggleRow
                  key={toggle.key}
                  title={toggle.title}
                  subtitle={toggle.subtitle}
                  value={toggle.value}
                  onChange={toggle.onChange}
                  last={index === toggles.length - 1}
                >
                  {toggle.extra}
                </ToggleRow>
              ))}
            </Panel>
            <Panel className="px-4">
              <LinkRow
                title="Theme"
                subtitle="Changes at once"
                value={THEMES[theme.look].name}
                valueLeading={
                  ornaments ? (
                    <Bow size={22} color={ornaments.bow.color} shade={ornaments.bow.shade} />
                  ) : (
                    simFace && <Glyph name="sentiment_very_satisfied" filled size={20} color={simFace as `#${string}`} />
                  )
                }
                onPress={() => setAskingTheme(true)}
              />
              <LinkRow
                title="Baby Buddy"
                subtitle="Server and your API key"
                value="Connected"
                valueClassName="text-diaper-ink"
                onPress={() => setAskingConnection(true)}
                last
              />
            </Panel>

            {canPinWidget && <Button label="Add widget to home screen" variant="outline" onPress={pinWidget} />}

            <Text
              className="mt-2 text-center text-caption font-bold text-muted"
              // Hidden: the Tap log is for chasing a tap that didn't land (implan-instant-taps), Android only.
              onLongPress={Platform.OS === 'android' ? () => router.push('/tap-log') : undefined}
            >
              Molly {Constants.expoConfig?.version ?? ''}
            </Text>
          </View>
        </ScrollView>
        <SaveBar dirty={dirty} onSave={save} pending={saving} />
      </BehindSheet>
      {askingTheme && <ThemeSheet onClose={() => setAskingTheme(false)} />}
      {askingConnection && <ConnectionSheet onClose={() => setAskingConnection(false)} />}
    </View>
  );
}

/** Every child in Baby Buddy, hidden ones marked: each opens its own screen. */
function ChildrenCard() {
  const { all, prefsOf } = useChildrenOnScreen();
  const now = useNow();
  return (
    <Panel className="px-4">
      {all.map((child, index) => {
        const prefs = prefsOf(child.id);
        const sub = `${ageLabel(child.birth_date, now)}${prefs.shown ? '' : ' · hidden'}`;
        return (
          <LinkRow
            key={child.id}
            title={child.first_name}
            subtitle={sub}
            spoken={`${child.first_name}, ${sub}`}
            leading={<Avatar name={child.first_name} hue={prefs.hue} size={48} square faded={!prefs.shown} />}
            onPress={() => router.push({ pathname: '/child/[id]', params: { id: String(child.id) } })}
            last={index === all.length - 1}
          />
        );
      })}
    </Panel>
  );
}

/** Opened from the Baby Buddy row: where Molly is connected, and signing out. */
function ConnectionSheet({ onClose }: { onClose: () => void }) {
  const { signOut } = useSession();
  const { credentials } = useSignedInSession();
  return (
    <Sheet label="Baby Buddy" title="Baby Buddy" onScrimPress={onClose}>
      <View className="gap-0.5 px-1">
        <Text className="text-sm font-extrabold text-muted">Connected to</Text>
        <Text selectable className="text-base font-extrabold">
          {credentials.baseUrl}
        </Text>
        <Text className="text-caption font-bold text-muted">
          {"With your own API key. Signing out removes it and Molly's data from this device."}
        </Text>
      </View>
      <Button label="Sign out" variant="outline" onPress={signOut} />
    </Sheet>
  );
}
