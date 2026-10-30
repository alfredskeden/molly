import { BabyBuddyError, type FeedingMethod, type Note, type Timer } from '@molly/api';
import {
  ageInMonths,
  ateLabel,
  agoText,
  clockText,
  centreText,
  eatQuestion,
  editorSubtitle,
  isSolidFeed,
  newCount,
  SOLIDS_METHOD,
  dayPlan,
  dayRhythm,
  dayWindow,
  diaperFor,
  drank,
  drankText,
  entrySavedFromTimer,
  feedingForStop,
  lastOfEach,
  placeOf,
  reminderFor,
  likelyDetail,
  likelySlots,
  parseSkip,
  windowsBefore,
  pastBoxes,
  ringGhosts,
  ringPager,
  SKIP_TAG,
  skipNote,
  sleepContext,
  startLabel,
  UNDONE_SKIP_TAG,
  windowDate,
  windowRow,
  windowStats,
  windowTitle,
  type CentreText,
  type DayRhythm,
  type DayWindow,
  type BottleDefaults,
  type EntriesByKind,
  type FeedingStopButton,
  type LikelySlot,
  type PlannedSleep,
  type Skip,
} from '@molly/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addEntry,
  adjustTime,
  byRhythm,
  cancelTimer,
  logDiaper,
  logFeed,
  logMedication,
  startTimer,
  stopFeeding,
  stopSleep,
  type Outcome,
  type Tracker,
} from '@/actions/trackers';
import { BehindSheet } from '@/components/sheet';
import { InkButton, Text } from '@/components/ui';
import { AddSheet } from '@/features/add/AddSheet';
import type { AddDraft } from '@/features/add/add-model';
import { ChildrenSheetFor } from '@/features/children/Switcher';
import { useChildPrefs, useChildrenOnScreen } from '@/features/children/use-children';
import { Editor } from '@/features/dashboard/Editor';
import { draftOf, isChanged, nudge, patchOf, withMethod, withNap, withNotes, type Draft, type EditTarget } from '@/features/dashboard/editor-model';
import { Header } from '@/features/dashboard/Header';
import { Pager } from '@/features/dashboard/Pager';
import { PastStats } from '@/features/dashboard/PastStats';
import { LikelyPanel } from '@/features/dashboard/LikelyPanel';
import { LockScreenSheet } from '@/features/dashboard/LockScreenSheet';
import { useOptimistic } from '@/features/dashboard/optimistic';
import { BottlePanel } from '@/features/feed/BottlePanel';
import { SolidsPanel } from '@/features/feed/SolidsPanel';
import { mergeDays, useDays } from '@/features/days/queries';
import { olderMayExist } from '@/features/days/weeks';
import { cardSpan, cardStats, recentDays } from '@/features/days/recent';
import { failureToast, outcomeToast, skipRefusedToast, staleStopToast, type Source } from '@/features/dashboard/outcome-messages';
import { Picker, type PickerOption } from '@/features/dashboard/Picker';
import { disclaimer, skipToast, spokenPrediction } from '@/features/dashboard/prediction-text';
import {
  useChildren,
  useClient,
  useKeyRejected,
  useLastBottle,
  useRecentFoods,
  usePastEntries,
  useRecentEntries,
  useRefreshAfterWrite,
  useRunningTimer,
  useSettings,
  useSkipNotes,
  useSyncWhenTimersChange,
  PREFETCH_PAST_MS,
} from '@/features/dashboard/queries';
import { LoadingAnnouncement, useSkeleton } from '@/features/dashboard/Skeleton';
import { Tiles, type TileState } from '@/features/dashboard/Tiles';
import { TodaySheet } from '@/features/dashboard/TodaySheet';
import { useSyncTodoReminders, useTodoBadge } from '@/features/todo/queries';
import { holdPolls } from '@/features/dashboard/writes';
import { METHOD_LABELS } from '@/features/dashboard/timeline-text';
import { UnreachableBanner } from '@/features/dashboard/Unreachable';
import { useNow } from '@/features/dashboard/use-now';
import { Moodlets } from '@/features/needs/Moodlets';
import { useNeeds } from '@/features/needs/use-needs';
import { useDelayed } from '@/features/dashboard/use-delayed';
import { useUpdatingOnReturn } from '@/features/dashboard/use-updating';
import { WhySheet } from '@/features/dashboard/WhySheet';
import { WindowRow } from '@/features/dashboard/WindowRow';
import { likelyKey, likelySlotOf, ringLikely, ringMarks, ringSleeps, type RingKey } from '@/features/ring/model';
import { Ring, type RingProps } from '@/features/ring/Ring';
import { useOnLive, useUnsavedOnReturn } from '@/features/return/ReturnProvider';
import { useToast } from '@/features/toast/toast';
import { answerStrength, HAPTICS, type HapticAction } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { spokenDuration } from '@/lib/time';
import { lockScreenPrompt } from '@/notification/model';
import { hasNotifications, notificationsAllowed } from '@/notification/sync';
import { useNotificationState } from '@/notification/use-state';
import { isRefusal, isRefusalError } from '@/session/key-check';
import { useSignedInSession } from '@/session/session';
import { loadSettings, saveSettings } from '@/storage/settings';
import { DEFAULT_SETTINGS, type Settings } from '@/storage/types';
import { PLAIN, spoken } from '@/theme/copy';
import { HeaderArt } from '@/theme/HeaderArt';
import { useCopy } from '@/theme/theme';
import { napReminderRing } from '@/widget/model';
import { loadNapReminder, remindAfterAppWrite, setNapReminder } from '@/widget/refresh';
import { syncWidget } from '@/widget/sync';

const DAY_MS = 24 * 60 * 60 * 1000;
/** The past fetch reaches back this many midnights (`usePastEntries`). */
const PAST_DAYS = 2;
const startOfDay = (time: Date, days: number) => new Date(time.getFullYear(), time.getMonth(), time.getDate() + days);

/** A past window stays at most this long before the ring snaps back to now. */
const SNAP_BACK_MS = 60_000;
/** The ring never shrinks below this; under it (huge fonts, a small phone) the screen scrolls instead. */
const MIN_RING = 280;
/**
 * What the ring's area leaves for the rest of the screen: the header above it, and below it the window row,
 * the two rows of tiles and the bottom padding. The area is worked out from the screen, never from what's
 * under it, so the ring keeps its size and place whatever the panel shows; the panel is anchored to the
 * bottom edge, so the tiles keep theirs too. Only a panel taller than all the room left makes the page scroll.
 */
const HEADER_SPACE = 80;
const PANEL_SPACE = 290;

/** Baby Buddy refused: a rejected key or a missing permission, which only the profile check tells apart. */
const refused = (outcome: Outcome) =>
  outcome.type === 'permissionNeeded' || (outcome.type === 'failed' && isRefusal(outcome.error));

/** Each kind's entries from both lists, the second winning by id: the past days with the fresher recent ones. */
function mergeEntries(older: EntriesByKind, newer: EntriesByKind): EntriesByKind {
  const merge = <T extends { id: number }>(a: T[], b: T[]) => [...new Map([...a, ...b].map((entry) => [entry.id, entry])).values()];
  return {
    sleep: merge(older.sleep, newer.sleep),
    feeding: merge(older.feeding, newer.feeding),
    change: merge(older.change, newer.change),
    medication: merge(older.medication, newer.medication),
  };
}

/** The plan's bedtime, when it reaches one. */
const bedtimeOf = (plan: PlannedSleep[]) => {
  const last = plan.at(-1);
  return last?.kind === 'bedtime' ? last : null;
};

const TONES = { sleep: 'sleep', feeding: 'feed', change: 'diaper', medication: 'med' } as const;

function asTarget<K extends Exclude<EditTarget['kind'], 'running'>>(kind: K, entry: Extract<EditTarget, { kind: K }>['entry'] | undefined) {
  return entry ? ({ kind, entry } as EditTarget) : null;
}

/** The entries with the editor's unsaved changes in them, so the ring shows the draft as it's made. */
function withDraft(entries: EntriesByKind, draft: Draft | undefined): EntriesByKind {
  if (!draft || draft.kind === 'running') return entries;
  const iso = (time: Date) => time.toISOString();
  switch (draft.kind) {
    case 'sleep':
      return { ...entries, sleep: entries.sleep.map((entry) => (entry.id === draft.id ? { ...entry, start: iso(draft.start), end: iso(draft.end) } : entry)) };
    case 'feeding':
      return {
        ...entries,
        feeding: entries.feeding.map((entry) =>
          entry.id === draft.id
            ? { ...entry, start: iso(draft.start), end: iso(draft.end), method: draft.method, notes: draft.notes }
            : entry,
        ),
      };
    case 'change':
      return {
        ...entries,
        change: entries.change.map((entry) => (entry.id === draft.id ? { ...entry, time: iso(draft.time), wet: draft.wet, solid: draft.solid } : entry)),
      };
    case 'medication':
      return { ...entries, medication: entries.medication.map((entry) => (entry.id === draft.id ? { ...entry, time: iso(draft.time) } : entry)) };
  }
}

/**
 * What the panel under the ring shows instead of the tiles. `feed` is the instant feed picker (Time feeds
 * off); `bottleStop` / `bottleNow` the bottle amount row after Bottle in the stop or the instant picker,
 * `solidsStop` / `solidsNow` the Solids panel after Solids.
 */
type Panel = 'tiles' | 'stopFeed' | 'feed' | 'bottleStop' | 'bottleNow' | 'solidsStop' | 'solidsNow' | 'diaper' | 'med';

const FEEDING_STOPS: { button: FeedingStopButton; label: string; spoken?: string; method: FeedingMethod }[] = [
  { button: 'left', label: 'Left', method: 'left breast' },
  { button: 'right', label: 'Right', method: 'right breast' },
  { button: 'both', label: 'Both', spoken: 'Both breasts', method: 'both breasts' },
  { button: 'bottle', label: 'Bottle', method: 'bottle' },
];

/** What the Solids panel has under its food field (chips, Save, padding), kept above the keyboard too. */
const SOLIDS_BELOW_FIELD = 160;

/** The past window's centre: what it held. */
function pastCentre(window: DayWindow, entries: EntriesByKind): CentreText {
  return centreText({ state: 'past', kind: window.kind, ...windowStats(window, entries) });
}

export default function Dashboard() {
  const client = useClient();
  const { childId, credentials } = useSignedInSession();
  const settings = useSettings().data ?? DEFAULT_SETTINGS;
  const { napWindow, bottle, solids, sex } = useChildPrefs();
  const { shown } = useChildrenOnScreen();
  const child = useChildren().data?.find((candidate) => candidate.id === childId);
  const sleepTimer = useRunningTimer('sleep');
  const feedingTimer = useRunningTimer('feeding');
  const entries = useRecentEntries();
  // Where the bottle amount row starts: the last bottle's type and amount.
  const lastBottle = useLastBottle(bottle);
  // The Solids panel's chips: this child's recent foods.
  const foods = useRecentFoods(solids);
  // The meal words name the child when no pronoun is set ("What did Ella eat?").
  const childName = child?.first_name ?? 'the baby';
  const skipNotes = useSkipNotes();
  const todo = useTodoBadge();
  useSyncTodoReminders();
  const refresh = useRefreshAfterWrite();
  const keyRejected = useKeyRejected();
  const haptic = useHaptic();
  const queryClient = useQueryClient();
  const optimistic = useOptimistic();
  // Every minute: the ring's centre and a running tile tick every second on their own.
  const now = useNow(60_000);
  const copy = useCopy();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const ringArea = Math.max(MIN_RING, screen.height - insets.top - insets.bottom - HEADER_SPACE - PANEL_SPACE);
  const [busy, setBusy] = useState(false);
  const [askingChildren, setAskingChildren] = useState(false);
  const [askingLockScreen, setAskingLockScreen] = useState<Tracker | null>(null);
  const [panel, setPanel] = useState<Panel>('tiles');
  // The tapped entry in the inline editor, with its unsaved changes; the ring shows them as they're made.
  const [editing, setEditing] = useState<{ key: RingKey; target: EditTarget; draft: Draft } | null>(null);
  const [sending, setSending] = useState<'save' | 'delete' | null>(null);
  const [askingWhy, setAskingWhy] = useState(false);
  // The likely sleep whose panel is open (a tapped ghost or the window row), in place of the tiles as the editor is.
  const [likely, setLikely] = useState<LikelySlot | null>(null);
  const selected = editing?.key ?? (likely !== null ? likelyKey(likely) : null);
  // A past window instead of the live one, as `<kind>-<start ms>`: the cap's pair, or one opened from Recent days.
  const [viewKey, setViewKey] = useState<string | null>(null);
  const showingPrevious = viewKey !== null;
  // A window asked for before its entries are loaded: shown once they are. `before`: the newest window that
  // starts before `time` (the cap's first tap, `‹`); otherwise the one holding `time` (an entry in the Today sheet).
  const [wantAt, setWantAt] = useState<{ time: number; before?: true; edit?: { key: RingKey; target: EditTarget } } | null>(null);
  const [askingToday, setAskingToday] = useState(false);
  const [askingAdd, setAskingAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  // The previous window's data is fetched just after the first load, so the cap's switch is instant.
  const [prefetchPast, setPrefetchPast] = useState(false);
  const pastEntries = usePastEntries(prefetchPast || showingPrevious || wantAt !== null, showingPrevious);
  // `?edit=sleep-12`: open that entry in the editor (the toast's Edit, a tapped entry elsewhere).
  // `?window=day-<start ms>`: show that window (a ring tapped on Recent days).
  const { edit, window: windowParam } = useLocalSearchParams<{ edit?: string; window?: string }>();
  const notifications = useNotificationState();
  // Unknown until checked: treated as allowed, so nothing flashes.
  const prompt = lockScreenPrompt({
    hasNotifications,
    enabled: settings.notifications,
    allowed: notifications.state === 'allowed' || notifications.state === null,
    prompted: settings.notificationPrompted,
  });
  useSyncWhenTimersChange(sleepTimer.data, feedingTimer.data);
  // The nap reminder this phone has for the child (Android): read from the widget cache, which each refresh updates.
  const napReminder = useQuery({
    queryKey: ['napReminder', childId],
    queryFn: () => loadNapReminder(childId),
    enabled: hasNotifications,
    refetchInterval: 60_000,
  });

  const firstLoadDone = entries.data !== undefined;
  useEffect(() => {
    if (!firstLoadDone) return;
    const timeout = setTimeout(() => setPrefetchPast(true), PREFETCH_PAST_MS);
    return () => clearTimeout(timeout);
  }, [firstLoadDone]);

  /** Closes the editor, the likely panel and pickers: the panel under the ring is back to the tiles or boxes. */
  const closePanels = useCallback(() => {
    setEditing(null);
    setLikely(null);
    setPanel('tiles');
  }, []);
  const showLive = useCallback(() => {
    setViewKey(null);
    setWantAt(null);
    closePanels();
  }, [closePanels]);

  // Android's back closes the editor or picker, then goes back to now, before it leaves the app.
  // Only while the dashboard has focus: it stays mounted under Settings, and its handler runs before the stack's.
  const back = editing !== null ? 'editor' : likely !== null ? 'likely' : panel !== 'tiles' ? 'panel' : viewKey !== null ? 'window' : null;
  useFocusEffect(
    useCallback(() => {
      if (!back || Platform.OS !== 'android') return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (back === 'editor') setEditing(null);
        else if (back === 'likely') setLikely(null);
        else if (back === 'panel') setPanel('tiles');
        else showLive();
        return true;
      });
      return () => subscription.remove();
    }, [back, showLive]),
  );

  // A past window is a glance: back to now after a minute on screen (a return: below). Not while one of its
  // entries is being edited: the minute starts again once the editor closes.
  const editingOpen = editing !== null;
  useEffect(() => {
    if (!showingPrevious || editingOpen) return;
    const timeout = setTimeout(showLive, SNAP_BACK_MS);
    return () => clearTimeout(timeout);
  }, [showingPrevious, editingOpen, viewKey, showLive]);
  // Back to now when the app comes back (`features/return`): on the web every time, on Android after a minute
  // away, which also closes the Add entry sheet ("Changes not saved" if it, or the editor, had changes).
  useOnLive(
    useCallback(
      (answer) => {
        showLive();
        if (answer === 'goLive') setAskingAdd(false);
      },
      [showLive],
    ),
  );
  useUnsavedOnReturn(editing !== null && isChanged(editing.draft, editing.target));


  /**
   * `guess` changes the screen at once. The refetch afterwards shows Baby Buddy's answer ("already
   * running", the real start); a failed write also undoes the guess, since the refetch may fail too.
   * `ending` is the timer a stop or cancel meant, as this screen knew it, to find what another phone
   * saved from it. The `tap` haptic plays with the guess; Baby Buddy's answer may add a warning or error.
   */
  async function run(
    source: Source,
    tap: HapticAction,
    action: () => Promise<Outcome>,
    guess: () => Promise<() => void>,
    ending?: { tracker: Tracker; timer: Timer | null | undefined },
  ) {
    setBusy(true);
    const release = holdPolls();
    const undo = await guess();
    haptic(HAPTICS[tap]);
    let refreshed = false;
    try {
      const outcome = await action();
      haptic(answerStrength(outcome));
      if (outcome.type === 'failed' || outcome.type === 'permissionNeeded') undo();
      // A rejected key replaces the dashboard with the "can't sign in" screen: no toast.
      if (refused(outcome) && (await keyRejected())) return;
      if (outcome.type === 'alreadyStopped' && ending?.timer) {
        release();
        await refresh();
        refreshed = true;
        const entries = queryClient.getQueryData<EntriesByKind>(['entries', childId]);
        const saved = entries ? entrySavedFromTimer(ending.tracker, ending.timer.start, entries) : null;
        toast(staleStopToast(ending.tracker, saved));
        return;
      }
      toast(outcomeToast(outcome, source, credentials.userId, copy));
      // Before the refresh below, which would otherwise draw the reminder as it was.
      await remindAfterAppWrite(outcome).catch((error: unknown) => console.warn('Molly reminder', error));
    } catch (error) {
      undo();
      throw error;
    } finally {
      release();
      if (!refreshed) await refresh();
      setBusy(false);
    }
  }

  /** A running timer's start, moved: shown at once, rolled back if Baby Buddy refuses. */
  async function moveStart(tracker: Tracker, timer: Timer, start: Date) {
    setBusy(true);
    const release = holdPolls();
    const undo = await optimistic.moved(tracker, start);
    const tone = tracker === 'feeding' ? 'feed' : 'sleep';
    try {
      const outcome = await adjustTime(client, { target: { kind: 'timer', id: timer.id }, time: start });
      haptic(answerStrength(outcome));
      if (outcome.type === 'failed') undo();
      if (outcome.type === 'failed' && isRefusal(outcome.error) && (await keyRejected())) return;
      toast(
        outcome.type === 'adjusted'
          ? { text: `Start moved to ${clockText(new Date(outcome.time))}`, tone }
          : outcome.error === 'notFound'
            ? { text: 'Already stopped', tone }
            : failureToast(outcome.error, outcome.message),
      );
    } catch (error) {
      undo();
      throw error;
    } finally {
      release();
      await refresh();
      setBusy(false);
    }
  }

  /** One tap, no confirm: the skip shows at once and is undone if Baby Buddy doesn't take the note. */
  async function skipNap(nap: PlannedSleep) {
    const at = new Date();
    const skip = { at, start: nap.start, end: nap.end };
    const note = { note: skipNote(skip), time: at.toISOString(), tags: [SKIP_TAG] };
    setBusy(true);
    const release = holdPolls();
    const undo = await optimistic.skipped(note);
    haptic(HAPTICS.log);
    try {
      const saved = await client.createNote({ child: childId, ...note });
      toast({ text: skipToast(bedtimeOf(planWith([...skips, skip]))), tone: 'sleep', undo: () => unskip(saved) });
    } catch (error) {
      undo();
      await noteFailed(error);
    } finally {
      release();
      await refresh();
      setBusy(false);
    }
  }

  /** Parents can't delete notes: Undo retags the note, so it leaves the `molly-skip` list. */
  async function unskip(note: Note) {
    setBusy(true);
    const release = holdPolls();
    const undo = await optimistic.unskipped(note.id);
    haptic(HAPTICS.cancel);
    try {
      await client.updateNote(note.id, { tags: [UNDONE_SKIP_TAG] });
      toast({ text: 'Skip undone', tone: 'sleep' });
    } catch (error) {
      undo();
      await noteFailed(error);
    } finally {
      release();
      await refresh();
      setBusy(false);
    }
  }

  /** A refusal is a rejected key (the "can't sign in" screen) or a missing permission. */
  async function noteFailed(error: unknown) {
    if (!(error instanceof BabyBuddyError)) throw error;
    if (isRefusalError(error)) {
      if (await keyRejected()) return;
      toast(skipRefusedToast);
      return;
    }
    toast(failureToast(error.kind));
  }

  const sleepRunning = sleepTimer.data ?? null;
  const feedRunning = feedingTimer.data ?? null;
  const loaded = entries.data;
  const last = loaded && lastOfEach(loaded);
  const birthDate = child?.birth_date ?? null;
  // The child's usual wake and bedtime, learned from the sleeps on hand: what decides day, night and the nap flag.
  const rhythm = dayRhythm(loaded?.sleep ?? [], birthDate, napWindow, now);
  const night = byRhythm(loaded?.sleep ?? [], rhythm);
  const skips = (skipNotes.data ?? []).flatMap((note) => {
    const skip = parseSkip(note);
    return skip ? [{ ...skip, note }] : [];
  });
  const planWith = (withSkips: Skip[]) =>
    loaded && birthDate
      ? dayPlan(loaded.sleep, sleepRunning, birthDate, rhythm, withSkips, now)
      : [];
  const plan = planWith(skips);
  const bedtime = bedtimeOf(plan);
  // The baby's day or night, not the clock's: recomputed every render so a setting change moves it at once.
  const liveWindow = loaded && dayWindow(loaded, sleepRunning, rhythm, now, bedtime);
  // Life Sim's needs (null in every other theme): the sleep need drains to the window row's next sleep.
  const needs = useNeeds({
    entries: loaded,
    sleepRunning,
    feedRunning,
    next: plan.find((planned) => !planned.skipped) ?? null,
    window: liveWindow || null,
    birthDate,
    day: rhythm,
    now,
  });
  const past = loaded && pastEntries.data ? mergeEntries(pastEntries.data, loaded) : null;
  // Windows older than the past fetch's two midnights come from Recent days' weeks.
  const viewStart = viewKey ? Number(viewKey.slice(viewKey.indexOf('-') + 1)) : null;
  // The oldest time the screen needs: the window on screen, or the one asked for.
  // The window before a time starts within a day of it.
  const reach = Math.min(viewStart ?? Infinity, wantAt ? wantAt.time - (wantAt.before ? DAY_MS : 0) : Infinity);
  const pastFrom = startOfDay(now, -PAST_DAYS).getTime();
  // Also on any past ring: whether `‹` has anything older to go to is only known from the weeks before.
  const days = useDays(reach < pastFrom || showingPrevious);
  const everything = past && (days.data ? mergeEntries(mergeDays(days.data.pages).entries, past) : past);
  const oldestWeek = days.data?.pages.at(-1);
  // Every entry since then is loaded; a window starting earlier would be missing some.
  const loadedFrom = oldestWeek ? Math.min(oldestWeek.from.getTime(), pastFrom) : pastFrom;
  // Unknown until a week is loaded.
  const olderWeeksMayExist = !oldestWeek || olderMayExist(days.data!.pages);
  // The live window, then every one before it back to the one on screen (and the one asked for), newest first.
  const daysBack = reach === Infinity ? 1 : Math.ceil((now.getTime() - reach) / DAY_MS) + 1;
  const windows = liveWindow ? [liveWindow, ...(everything ? windowsBefore(everything, rhythm, now, daysBack, sleepRunning) : [])] : [];
  const keyOf = (window: DayWindow) => `${window.kind}-${window.start.getTime()}`;
  const viewIndex = viewKey ? windows.findIndex((window) => keyOf(window) === viewKey) : 0;
  const previous = windows[1] ?? null;
  const shownWindow = viewKey ? (windows[viewIndex] ?? null) : liveWindow;
  const live = !showingPrevious;
  const shownEntries = showingPrevious ? everything : loaded;
  /** The cap's other half of the pair, as the design's `pairK`: windows pair up counting back from the live one. */
  const pairOf = (index: number) => (index % 2 === 0 ? index + 1 : index - 1);

  // Only data the dashboard has never had shows as a skeleton; a cached or earlier answer stays on screen.
  const timersKnown = sleepTimer.data !== undefined && feedingTimer.data !== undefined;
  const skeleton = useSkeleton(!timersKnown || !loaded);

  const start = async (tracker: Tracker) => {
    closePanels();
    await run(tracker, 'startTimer', () => startTimer(client, { child: childId, tracker }), () => optimistic.started(tracker));
    // The lock-screen notification needs Android's permission: ask when it's first useful, with the timer
    // already running behind the sheet.
    if (prompt === 'sheet' && queryClient.getQueryData<Timer | null>(['timer', childId, tracker])) setAskingLockScreen(tracker);
  };

  /** Answered once per device, either way; afterwards the dashboard offers it quietly. */
  async function answerLockScreen(turnOn: boolean) {
    setAskingLockScreen(null);
    queryClient.setQueryData<Settings>(['settings'], { ...settings, notificationPrompted: true });
    await saveSettings({ ...(await loadSettings()), notificationPrompted: true });
    if (turnOn) await turnOnLockScreen();
  }

  async function turnOnLockScreen() {
    if ((await notifications.turnOn()) === 'granted') await syncWidget();
  }
  const timerOf = (tracker: Tracker) => (tracker === 'sleep' ? sleepTimer.data : feedingTimer.data);
  const cancel = (tracker: Tracker) =>
    run(tracker, 'cancel', () => cancelTimer(client, { child: childId, tracker }), () => optimistic.ended(tracker), {
      tracker,
      timer: timerOf(tracker),
    });
  const medicate = (name: string) =>
    run('medication', 'log', () => logMedication(client, { child: childId, name }), () => optimistic.medicated(name));
  const endSleep = () =>
    run(
      'sleep',
      'stopTimer',
      () => stopSleep(client, { child: childId, night }),
      () => optimistic.ended('sleep'),
      { tracker: 'sleep', timer: sleepTimer.data },
    );
  const endFeed = (button: FeedingStopButton, chosen: BottleDefaults = lastBottle, food?: string) =>
    run(
      'feeding',
      'stopTimer',
      () => stopFeeding(client, { child: childId, button, bottle: chosen, food }),
      () => optimistic.ended('feeding'),
      { tracker: 'feeding', timer: feedingTimer.data },
    );
  /** Time feeds off: the feed is saved finished at once. */
  const feedNow = (button: FeedingStopButton, chosen: BottleDefaults = lastBottle, food?: string) => {
    const feeding = feedingForStop(button, chosen, food);
    return run(
      'feeding',
      'log',
      () => logFeed(client, { child: childId, button, bottle: chosen, food }),
      () => optimistic.fed({ ...feeding, amount: feeding.amount ?? null }),
    );
  };
  const diaper = (button: 'wet' | 'dirty' | 'both') =>
    run('diaper', 'log', () => logDiaper(client, { child: childId, button }), () => optimistic.changed(diaperFor(button)));

  /** Picker options act at once and close the picker. */
  const closing = (action: () => void) => () => {
    setPanel('tiles');
    action();
  };

  function select(key: RingKey) {
    setPanel('tiles');
    const slot = likelySlotOf(key);
    if (slot !== null) {
      setEditing(null);
      setLikely((current) => (current === slot ? null : slot));
      return;
    }
    setLikely(null);
    if (key === 'running-feed') {
      setEditing(null);
      setPanel('stopFeed');
      return;
    }
    if (editing?.key === key) return setEditing(null);
    const target = targetOf(key);
    setEditing(target && { key, target, draft: draftOf(target) });
  }

  /** The entry behind a ring key, from the window on screen. Guesses aren't in Baby Buddy yet: not editable. */
  function targetOf(key: RingKey): EditTarget | null {
    if (key === 'running-sleep') return sleepRunning && { kind: 'running', tracker: 'sleep', start: sleepRunning.start, earliest: last?.sleep?.end ?? null };
    if (key === 'running-feed') return feedRunning && { kind: 'running', tracker: 'feeding', start: feedRunning.start, earliest: last?.feeding?.end ?? null };
    const [kind, id] = [key.slice(0, key.indexOf('-')), Number(key.slice(key.indexOf('-') + 1))];
    if (!shownEntries || id < 0) return null;
    const find = <T extends { id: number }>(list: T[]) => list.find((entry) => entry.id === id);
    if (kind === 'sleep') return asTarget('sleep', find(shownEntries.sleep));
    if (kind === 'feeding') return asTarget('feeding', find(shownEntries.feeding));
    if (kind === 'change') return asTarget('change', find(shownEntries.change));
    return asTarget('medication', find(shownEntries.medication));
  }

  const changeDraft = (change: (draft: Draft) => Draft) =>
    setEditing((current) => current && { ...current, draft: change(current.draft) });

  /** Done: an unchanged draft just closes; the running sleep moves its timer; an entry is saved, shown at once. */
  async function saveEdit() {
    if (!editing || sending) return;
    const { target, draft } = editing;
    if (!isChanged(draft, target)) return setEditing(null);
    if (target.kind === 'running' && draft.kind === 'running') {
      setEditing(null);
      const timer = timerOf(draft.tracker);
      if (timer) await moveStart(draft.tracker, timer, draft.start);
      return;
    }
    if (target.kind === 'running') return;
    const patch = patchOf(draft, target);
    setSending('save');
    const release = holdPolls();
    const undo = await optimistic.edited(target.kind, target.entry.id, patch);
    haptic(HAPTICS.log);
    try {
      await client.editEntry(target.kind, target.entry.id, patch);
      setEditing(null);
      toast({ text: 'Changes saved', tone: TONES[target.kind] });
    } catch (error) {
      undo();
      await writeFailed(error);
    } finally {
      release();
      setSending(null);
      await refresh();
    }
  }

  /** Delete, after the editor's second tap; a running timer's is Cancel sleep / Cancel feed. */
  async function deleteEdit() {
    if (!editing || sending) return;
    const { target } = editing;
    if (target.kind === 'running') {
      setEditing(null);
      await cancel(target.tracker);
      return;
    }
    setSending('delete');
    const release = holdPolls();
    const undo = await optimistic.deleted(target.kind, target.entry.id);
    haptic(HAPTICS.cancel);
    try {
      await client.deleteEntry(target.kind, target.entry.id);
      setEditing(null);
      toast({ text: 'Entry deleted', tone: TONES[target.kind] });
    } catch (error) {
      undo();
      await writeFailed(error);
    } finally {
      release();
      setSending(null);
      await refresh();
    }
  }

  /** Add entry's Save: the sheet waits for Baby Buddy, then closes and toasts what was saved. */
  async function saveAdded(draft: AddDraft) {
    if (adding) return;
    setAdding(true);
    const source: Source = draft.kind === 'sleep' ? 'sleep' : draft.kind === 'feed' ? 'feeding' : draft.kind === 'diaper' ? 'diaper' : 'medication';
    try {
      const outcome = await addEntry(client, { child: childId, draft, night, bottle: lastBottle });
      haptic(answerStrength(outcome));
      if (refused(outcome) && (await keyRejected())) return;
      if (outcome.type !== 'failed' && outcome.type !== 'permissionNeeded') {
        setAskingAdd(false);
      }
      toast(outcomeToast(outcome, source, credentials.userId, copy));
    } finally {
      await refresh();
      setAdding(false);
    }
  }

  /** A refused write is a rejected key (the "can't sign in" screen) or a missing permission. */
  async function writeFailed(error: unknown) {
    if (!(error instanceof BabyBuddyError)) throw error;
    haptic(answerStrength({ type: 'failed', error: error.kind }));
    if (isRefusalError(error) && (await keyRejected())) return;
    // Baby Buddy's own reason when it gives one ("Date/time can not be in the future.").
    toast(failureToast(error.kind, error.fields ? Object.values(error.fields).flat().join(' ') : undefined));
  }

  // Opened once the entries it names are loaded (set while rendering, React's way to follow a prop);
  // the param is cleared after, so a later visit doesn't reopen it.
  const editKey = edit as RingKey | undefined;
  const [openedEdit, setOpenedEdit] = useState<string | null>(null);
  if (!editKey && openedEdit) setOpenedEdit(null);
  if (editKey && editKey !== openedEdit && loaded) {
    const target = targetOf(editKey);
    setOpenedEdit(editKey);
    if (target) {
      setViewKey(null);
      setPanel('tiles');
      setLikely(null);
      setEditing({ key: editKey, target, draft: draftOf(target) });
    }
  }
  useEffect(() => {
    if (editKey && openedEdit === editKey) router.setParams({ edit: undefined });
  }, [editKey, openedEdit]);
  const [openedWindow, setOpenedWindow] = useState<string | null>(null);
  if (!windowParam && openedWindow) setOpenedWindow(null);
  if (windowParam && windowParam !== openedWindow) {
    setOpenedWindow(windowParam);
    closePanels();
    setViewKey(liveWindow && keyOf(liveWindow) === windowParam ? null : windowParam);
  }
  useEffect(() => {
    if (windowParam && openedWindow === windowParam) router.setParams({ window: undefined });
  }, [windowParam, openedWindow]);

  // Reads that fail keep the last answer on screen, dimmed, with when it was from. A refusal isn't
  // "can't reach": the profile check decides between the "can't sign in" screen and a permission.
  const dashboardQueries = [sleepTimer, feedingTimer, entries];
  const unreachable = dashboardQueries.some((query) => query.isError && !isRefusalError(query.error));
  const updatedAt = dashboardQueries.filter((query) => query.data !== undefined).map((query) => query.dataUpdatedAt);
  const asOf = unreachable && updatedAt.length > 0 ? agoText(new Date(Math.min(...updatedAt)), now) : null;
  const updating = useUpdatingOnReturn(dashboardQueries.some((query) => query.isFetching));

  const centre: RingProps['centre'] | null = !shownWindow || !shownEntries
    ? null
    : !live
      ? () => pastCentre(shownWindow, shownEntries)
      : sleepRunning
        ? (at) => ({
            ...centreText({ state: 'sleeping', since: new Date(sleepRunning.start), nap: !night({ start: new Date(sleepRunning.start), end: at }), now: at }),
            label: copy.sleeping,
            spoken: spokenDuration(at.getTime() - Date.parse(sleepRunning.start)),
          })
        : feedRunning
          ? (at) => ({
              ...centreText({ state: 'feeding', since: new Date(feedRunning.start), now: at }),
              label: copy.feeding,
              spoken: spokenDuration(at.getTime() - Date.parse(feedRunning.start)),
            })
          : (at) => ({
              ...centreText({ state: 'awake', since: last?.sleep ? new Date(last.sleep.end) : null, afterNap: last?.sleep?.nap ?? false, now: at }),
              label: copy.awake,
            });

  const titleOf = (window: DayWindow) => (liveWindow ? windowTitle(window, liveWindow) : '');
  const wanted =
    wantAt &&
    (wantAt.before
      ? windows.find((window) => window.start.getTime() < wantAt.time)
      : windows.find((window) => wantAt.time >= window.start.getTime() && wantAt.time < window.end.getTime()));
  const wantLoaded =
    !!wantAt && !!everything && (wantAt.before ? !!wanted && wanted.start.getTime() >= loadedFrom : wantAt.time >= loadedFrom);
  // Older than every loaded week: the next week is fetched (an effect below), unless Baby Buddy has nothing older.
  const wantOlder = !!wantAt && !!everything && !wantLoaded;
  const giveUp = wantOlder && !days.isFetching && (days.isError || (!!oldestWeek && !olderWeeksMayExist));
  // Given up once loaded without it: in the gap before a morning wake, or older than anything in Baby Buddy.
  if (wantAt && (wantLoaded || giveUp)) {
    setWantAt(null);
    if (wanted && wantLoaded) setViewKey(wanted === liveWindow ? null : keyOf(wanted));
    if (wantAt.edit) {
      setLikely(null);
      setEditing({ ...wantAt.edit, draft: draftOf(wantAt.edit.target) });
    }
  }
  const waiting = useDelayed(wantAt !== null && !wantAt.edit);

  // `‹` and `›` on a past ring. Older may exist while something loaded starts before the ring, or older weeks may.
  const shownStart = shownWindow?.start.getTime() ?? 0;
  const entryBefore =
    !!everything &&
    (everything.sleep.some((entry) => Date.parse(entry.start) < shownStart) ||
      everything.feeding.some((entry) => Date.parse(entry.start) < shownStart) ||
      everything.change.some((entry) => Date.parse(entry.time) < shownStart) ||
      everything.medication.some((entry) => Date.parse(entry.time) < shownStart));
  // Nothing loaded before the ring: the week before is fetched to find out whether anything older exists.
  const canFetch = !!oldestWeek && olderWeeksMayExist && !days.isFetching && !days.isError;
  const fetchOlder = canFetch && (wantOlder || (!live && !!everything && !entryBefore));
  const { fetchNextPage } = days;
  useEffect(() => {
    if (fetchOlder) void fetchNextPage();
  }, [fetchOlder, fetchNextPage]);
  const pager =
    !live && viewIndex >= 1
      ? ringPager({ windows, index: viewIndex, loadedFrom: new Date(loadedFrom), olderMayExist: entryBefore || olderWeeksMayExist })
      : null;
  function stepBack() {
    if (!pager || !shownWindow) return;
    closePanels();
    const { window, load } = pager.previous;
    if (window && !load) setViewKey(keyOf(window));
    else setWantAt({ time: shownWindow.start.getTime(), before: true });
  }
  function stepForward() {
    if (!pager) return;
    closePanels();
    setWantAt(null);
    if (pager.next.live) showLive();
    else setViewKey(keyOf(pager.next.window));
  }
  const pairWindow = windows[pairOf(viewIndex)];
  const capLabel =
    live || pairWindow === liveWindow
      ? live
        ? `Switch to ${previous ? titleOf(previous).toLowerCase() : liveWindow && liveWindow.kind === 'day' ? 'last night' : 'today'}`
        : `Back to ${liveWindow ? titleOf(liveWindow).toLowerCase() : 'now'}`
      : `Switch to ${pairWindow ? titleOf(pairWindow).toLowerCase() : 'the other half'}`;

  const tiles: Record<'sleep' | 'feed' | 'diaper' | 'med', TileState> = {
    sleep: {
      name: copy.sleep,
      spoken: spoken(copy.startSleep, PLAIN.startSleep) ?? copy.startSleep,
      last: last === undefined ? undefined : last.sleep ? { at: last.sleep.end } : null,
      runningSince: sleepTimer.data === undefined ? undefined : (sleepRunning?.start ?? null),
      stopName: copy.stopSleep,
      spokenStop: PLAIN.stopSleep,
      onPress: () => void (sleepRunning ? endSleep() : start('sleep')),
    },
    feed: {
      name: copy.feed,
      spoken: settings.feedTimer ? (spoken(copy.startFeed, PLAIN.startFeed) ?? copy.startFeed) : PLAIN.feed,
      last: last === undefined ? undefined : last.feeding ? { at: last.feeding.end, detail: METHOD_LABELS[last.feeding.method] } : null,
      runningSince: feedingTimer.data === undefined ? undefined : (feedRunning?.start ?? null),
      stopName: copy.stopFeed,
      spokenStop: PLAIN.stopFeed,
      onPress: () => {
        // A running feed stops as always, whatever Time feeds says: it may be the other phone's.
        if (!feedRunning && settings.feedTimer) return void start('feeding');
        setEditing(null);
        setLikely(null);
        setPanel(feedRunning ? 'stopFeed' : 'feed');
      },
    },
    diaper: {
      name: copy.diaper,
      spoken: PLAIN.diaper,
      last: last === undefined ? undefined : last.change ? { at: last.change.time } : null,
      onPress: () => {
        setEditing(null);
        setLikely(null);
        setPanel('diaper');
      },
    },
    med: {
      name: copy.med,
      spoken: PLAIN.med,
      last: loaded === undefined ? undefined : latestMedication(loaded),
      onPress: () => {
        setEditing(null);
        setLikely(null);
        setPanel('med');
      },
    },
  };

  /** Left / Right / Both act at once; Bottle opens the amount row first, Solids (when on) the food panel. */
  const feedOptionsFor = (bottlePanel: Panel, solidsPanel: Panel, act: (button: FeedingStopButton) => void): PickerOption[] => [
    ...FEEDING_STOPS.map(({ button, label, spoken: name }): PickerOption => ({
      label,
      spoken: name,
      icon: button === 'left' ? 'arrow_back' : button === 'right' ? 'arrow_forward' : button === 'both' ? 'swap_horiz' : 'water_full',
      ribbon: button === 'bottle' ? 'bottle' : 'feed',
      onPress: button === 'bottle' ? () => setPanel(bottlePanel) : closing(() => act(button)),
    })),
    ...(solids
      ? [{ label: copy.solids, spoken: spoken(copy.solids, PLAIN.solids), icon: 'restaurant' as const, onPress: () => setPanel(solidsPanel) }]
      : []),
  ];
  const feedOptions = feedOptionsFor('bottleStop', 'solidsStop', (button) => void endFeed(button));
  const instantFeedOptions = feedOptionsFor('bottleNow', 'solidsNow', (button) => void feedNow(button));
  // Five options: the sides on one row, Bottle and Solids on the next.
  const feedColumns = solids ? [3, 2] : 2;
  /** The Solids panel's Save: the meal now, or the running feed stopped as one. */
  const saveSolids = (food: string) => {
    const stopping = panel === 'solidsStop';
    setPanel('tiles');
    void (stopping ? endFeed('solids', lastBottle, food) : feedNow('solids', lastBottle, food));
  };
  /** The amount row's Save: the last bottle's type with the amount chosen. */
  const saveBottle = (amount: number) => {
    const chosen = { type: lastBottle.type, amount };
    const stopping = panel === 'bottleStop';
    setPanel('tiles');
    void (stopping ? endFeed('bottle', chosen) : feedNow('bottle', chosen));
  };
  const diaperOptions: PickerOption[] = (['wet', 'dirty', 'both'] as const).map((button) => ({
    label: copy[button],
    spoken: spoken(copy[button], PLAIN[button]),
    icon: button === 'wet' ? 'water_drop' : button === 'dirty' ? 'sentiment_stressed' : 'star',
    slot: button,
    ribbon: `diaper-${button}`,
    onPress: closing(() => void diaper(button)),
  }));
  // The editor's draft on the ring as it's made: the entry's new times, or the running sleep's new start.
  const draft = editing?.draft;
  const ringEntries = shownEntries && withDraft(shownEntries, draft);
  const moved = (timer: Timer | null, tracker: Tracker) =>
    timer && draft?.kind === 'running' && draft.tracker === tracker ? { ...timer, start: draft.start.toISOString() } : timer;
  const ringSleep = moved(sleepRunning, 'sleep');
  const ringFeed = moved(feedRunning, 'feeding');
  const editorProps = editing && shownWindow ? editorFor(editing.target, editing.draft, titleOf(shownWindow)) : null;

  function editorFor(target: EditTarget, draft: Draft, windowName: string) {
    // Exact times being set read as clock times; the subtitle above says how long and how long ago.
    const onNudge = (field: 'start' | 'end' | 'time', minutes: number) => changeDraft((current) => nudge(current, field, minutes, now));
    const range = (start: Date, end: Date) => [
      { label: 'Start', value: clockText(start), field: 'start' as const },
      { label: 'End', value: clockText(end), field: 'end' as const },
    ];
    const time = (at: Date) => [{ label: 'Time', value: clockText(at), field: 'time' as const }];
    const common = { onNudge, sending, onDone: saveEdit, onClose: () => setEditing(null), onDelete: deleteEdit, deleteLabel: 'Delete' };
    if (target.kind === 'running' && draft.kind === 'running') {
      const sleep = draft.tracker === 'sleep';
      return {
        ...common,
        tone: sleep ? ('sleep' as const) : ('feed' as const),
        icon: sleep ? ('bedtime' as const) : ('breastfeeding' as const),
        title: sleep ? (night({ start: draft.start, end: now }) ? 'Night sleep' : 'Nap') : 'Feed',
        sub: editorSubtitle({ start: draft.start, end: null }, now, windowName),
        rows: [{ label: 'Start', value: clockText(draft.start), field: 'start' as const }],
        deleteLabel: sleep ? copy.cancelSleep : copy.cancelFeed,
      };
    }
    if (target.kind === 'sleep' && draft.kind === 'sleep') {
      return {
        ...common,
        tone: 'sleep' as const,
        icon: 'bedtime' as const,
        title: target.entry.nap ? 'Nap' : 'Night sleep',
        sub: editorSubtitle(draft, now, windowName),
        rows: range(draft.start, draft.end),
        kinds: {
          label: 'Saved as',
          options: [
            { value: 'nap', label: 'Nap' },
            { value: 'night', label: 'Night sleep' },
          ],
          value: draft.nap ? 'nap' : 'night',
          onChange: (kind: string) => changeDraft((current) => withNap(current, kind === 'nap')),
        },
      };
    }
    if (target.kind === 'feeding' && draft.kind === 'feeding') {
      const meal = isSolidFeed(draft);
      // Solids while the setting is on, or for a meal saved before it was turned off.
      const withSolids = solids || isSolidFeed(target.entry);
      return {
        ...common,
        tone: 'feed' as const,
        icon: meal ? ('restaurant' as const) : ('breastfeeding' as const),
        title: 'Feed',
        sub: editorSubtitle(draft, now, windowName),
        rows: range(draft.start, draft.end),
        kinds: {
          label: 'Feed kind',
          options: [
            ...FEEDING_STOPS.map(({ label, method }) => ({ value: method, label })),
            ...(withSolids ? [{ value: SOLIDS_METHOD, label: 'Solids' }] : []),
          ],
          // A `self fed` meal from Baby Buddy shows as Solids too.
          value: meal ? SOLIDS_METHOD : draft.method,
          onChange: (method: string) => changeDraft((current) => withMethod(current, method as FeedingMethod, bottle)),
          small: withSolids,
        },
        food: meal
          ? {
              label: ateLabel(childName, sex),
              value: draft.notes ?? '',
              onChange: (text: string) => changeDraft((current) => withNotes(current, text)),
            }
          : undefined,
        amount:
          draft.method === 'bottle'
            ? {
                value: draft.amount ?? 0,
                onStep: (ml: number) =>
                  changeDraft((current) => (current.kind === 'feeding' ? { ...current, amount: Math.max(0, (current.amount ?? 0) + ml) } : current)),
              }
            : undefined,
      };
    }
    if (target.kind === 'change' && draft.kind === 'change') {
      const kind = draft.wet && draft.solid ? 'both' : draft.solid ? 'dirty' : 'wet';
      return {
        ...common,
        tone: 'diaper' as const,
        icon: 'baby_changing_station' as const,
        title: 'Diaper',
        sub: editorSubtitle({ start: draft.time }, now, windowName),
        rows: time(draft.time),
        kinds: {
          label: 'Diaper kind',
          options: (['wet', 'dirty', 'both'] as const).map((value) => ({ value, label: copy[value] })),
          value: kind,
          onChange: (value: string) =>
            changeDraft((current) => (current.kind === 'change' ? { ...current, wet: value !== 'dirty', solid: value !== 'wet' } : current)),
        },
      };
    }
    if (target.kind === 'medication' && draft.kind === 'medication') {
      return {
        ...common,
        tone: 'med' as const,
        icon: 'medication' as const,
        title: target.entry.name,
        sub: editorSubtitle({ start: draft.time }, now, windowName),
        rows: time(draft.time),
      };
    }
    return null;
  }

  // A running nap counts: the row names the sleep after it.
  const napsSoFar =
    loaded && liveWindow
      ? loaded.sleep.filter((entry) => Date.parse(entry.start) >= liveWindow.start.getTime()).length + (sleepRunning ? 1 : 0)
      : 0;
  const liveDay = live && liveWindow?.kind === 'day';
  const nextRow = liveDay ? windowRow(plan, napsSoFar, now) : null;
  const next = plan.find((planned) => !planned.skipped) ?? null;
  const prediction = next && birthDate ? { next, ageMonths: ageInMonths(birthDate, now) } : null;
  // The likely sleep's panel, while the plan still has it: it closes once that sleep starts, is skipped or the day ends.
  const detail =
    likely !== null && liveDay && loaded
      ? likelyDetail(plan, likely, napsSoFar, sleepContext(loaded.sleep, sleepRunning, birthDate, rhythm, now)?.pastDays ?? [], now)
      : null;
  if (likely !== null && !detail) setLikely(null);
  const row = !editing && !detail && panel === 'tiles' ? nextRow : null;
  // The panel's bell is on when this phone's reminder is for this sleep of this day.
  const reminded = napReminder.data;
  const bellOn =
    !!detail &&
    !!liveWindow &&
    reminded?.ring != null &&
    reminded.day === liveWindow.start.toISOString() &&
    reminded.place === placeOf(plan, detail.slot, napsSoFar);

  /** The bell: off → asks for notifications if needed, then sets the reminder; on → removes it. */
  async function toggleNapReminder(slot: LikelySlot) {
    if (!loaded || !liveWindow) return;
    haptic(HAPTICS.log);
    if (bellOn) {
      await setNapReminder(childId, null);
    } else {
      const stored = reminderFor(plan, slot, napsSoFar, liveWindow, new Date());
      if (!stored) return;
      if (!notificationsAllowed() && (await notifications.turnOn()) !== 'granted') return;
      const ring = napReminderRing(stored, { sleeps: loaded.sleep, running: sleepRunning, birthDate, napWindow, skips, allowed: true, now: new Date() });
      if (!ring) return;
      await setNapReminder(childId, { ...stored, ring });
    }
    await napReminder.refetch();
  }
  const nextSlot = likelySlots(plan, napsSoFar).find((slot) => slot !== null) ?? null;

  const medOptions: PickerOption[] = [
    { label: 'Vitamin D', icon: 'medication', ribbon: 'med', onPress: closing(() => void medicate('Vitamin D')) },
  ];

  const sheetOpen = askingLockScreen !== null || askingAdd || askingToday || askingWhy || askingChildren;
  return (
    <View className="flex-1 bg-bg">
      <BehindSheet sheetOpen={sheetOpen}>
        <HeaderArt />
        {/* Scrolls a focused field (the Solids panel's food) above the keyboard, with the chips and Save under it. */}
        <KeyboardAwareScrollView
          bottomOffset={SOLIDS_BELOW_FIELD}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 28 }}
          keyboardShouldPersistTaps="handled"
        >
          {live ? (
          <Header
            name={child?.first_name || copy.appName}
            dateLine={liveWindow ? `${titleOf(liveWindow)} · ${windowDate(liveWindow)}` : windowDate({ start: now })}
            updating={updating}
            onChildren={shown.length > 1 ? () => setAskingChildren(true) : null}
            onHistory={() => {
              closePanels();
              setAskingToday(true);
            }}
            onAdd={() => {
              closePanels();
              setAskingAdd(true);
            }}
            onSettings={() => router.push('/settings')}
            historyLabel={liveWindow?.kind === 'night' ? 'Tonight' : 'Today'}
            onTodo={() => {
              closePanels();
              router.push('/todo');
            }}
            todoNew={todo.items ? newCount(todo.items, todo.seen) : 0}
          />
          ) : pager && shownWindow ? (
            <Pager
              title={titleOf(shownWindow)}
              date={windowDate(shownWindow)}
              night={shownWindow.kind === 'night'}
              previous={pager.previous}
              next={pager.next}
              waiting={waiting}
              onPrevious={stepBack}
              onNext={stepForward}
            />
          ) : (
            // The past window is still loading: the pager's room, so the ring doesn't move when it comes.
            <View className="min-h-[68px]" />
          )}

          <LoadingAnnouncement loading={skeleton} />

          <View className={`px-1.5 ${unreachable ? 'opacity-60' : ''}`} style={{ height: ringArea }}>
            {shownWindow && shownEntries && centre ? (
              <Ring
                window={shownWindow}
                live={live}
                now={now}
                sleeps={ringSleeps(shownWindow, (ringEntries ?? shownEntries).sleep, live ? ringSleep : null, now)}
                marks={ringMarks(shownWindow, ringEntries ?? shownEntries, live ? ringFeed : null)}
                ghosts={live && shownWindow.kind === 'day' ? ringLikely(ringGhosts(shownWindow, plan, now, napsSoFar)) : []}
                centre={centre}
                startLabel={startLabel(shownWindow)}
                capLabel={capLabel}
                needs={needs}
                onCap={() => {
                  closePanels();
                  const pair = windows[pairOf(viewIndex)];
                  // The window before isn't loaded yet: fetch it and switch once it is.
                  if (live && !pair) return liveWindow && setWantAt({ time: liveWindow.start.getTime(), before: true });
                  setViewKey(pair && pair !== liveWindow ? keyOf(pair) : null);
                }}
                selected={selected}
                onSelect={select}
              />
            ) : (
              skeleton && <RingSkeleton />
            )}
          </View>

          {/* Anchored to the bottom: the tiles (or the picker / editor in their place) always sit on the screen's
              bottom edge, and whatever appears above them grows up into the space under the ring. */}
          <View className="flex-1 justify-end gap-3 px-4 pt-3">
            {unreachable && <UnreachableBanner asOf={asOf} onRetry={() => queryClient.refetchQueries({ type: 'active' })} />}
            {!live && (
              <InkButton label="Back to now" icon={{ name: 'undo' }} onPress={showLive} />
            )}
            {prompt === 'heroLine' && (sleepRunning || feedRunning) && (
              <LockScreenLine onTurnOn={turnOnLockScreen} />
            )}
            {editorProps ? (
              <Editor {...editorProps} />
            ) : detail && prediction ? (
              <LikelyPanel
                detail={detail}
                disclaimer={disclaimer(prediction.next, prediction.ageMonths).text}
                onWhy={detail.next ? () => setAskingWhy(true) : null}
                onSkip={
                  detail.next && detail.slot !== 'bedtime' && next && !sleepRunning
                    ? () => {
                        setLikely(null);
                        void skipNap(next);
                      }
                    : null
                }
                onStart={sleepRunning ? null : () => void start('sleep')}
                bell={
                  hasNotifications
                    ? { on: bellOn, disabled: detail.start <= now, onPress: () => void toggleNapReminder(detail.slot) }
                    : null
                }
                onClose={() => setLikely(null)}
              />
            ) : panel === 'stopFeed' && feedRunning ? (
              <Picker
                tone="feed"
                title={copy.stopAs}
                spokenTitle={spoken(copy.stopAs, PLAIN.stopAs)}
                options={feedOptions}
                columns={feedColumns}
                cancel={{ label: copy.cancelFeed, spoken: spoken(copy.cancelFeed, PLAIN.cancelFeed), onPress: closing(() => void cancel('feeding')) }}
                extra={{
                  label: 'Edit start',
                  onPress: () => {
                    const target = targetOf('running-feed');
                    setPanel('tiles');
                    setEditing(target && { key: 'running-feed', target, draft: draftOf(target) });
                  },
                }}
                busy={busy}
                onClose={() => setPanel('tiles')}
              />
            ) : panel === 'feed' && !feedRunning ? (
              <Picker
                tone="feed"
                title={copy.feedAs}
                spokenTitle={spoken(copy.feedAs, PLAIN.feedAs)}
                options={instantFeedOptions}
                columns={feedColumns}
                busy={busy}
                onClose={() => setPanel('tiles')}
              />
            ) : (panel === 'bottleStop' && feedRunning) || (panel === 'bottleNow' && !feedRunning) ? (
              <BottlePanel
                title="Bottle"
                amount={lastBottle.amount ?? null}
                busy={busy}
                onSave={saveBottle}
                onClose={() => setPanel(panel === 'bottleStop' ? 'stopFeed' : 'feed')}
              />
            ) : (panel === 'solidsStop' && feedRunning) || (panel === 'solidsNow' && !feedRunning) ? (
              <SolidsPanel
                title={copy.solids}
                spokenTitle={spoken(copy.solids, PLAIN.solids)}
                question={eatQuestion(childName, sex)}
                foods={foods}
                busy={busy}
                onSave={saveSolids}
                onClose={() => setPanel(panel === 'solidsStop' ? 'stopFeed' : 'feed')}
              />
            ) : panel === 'diaper' ? (
              <Picker tone="diaper" title={copy.diaper} spokenTitle={spoken(copy.diaper, PLAIN.diaper)} options={diaperOptions} columns={3} busy={busy} onClose={() => setPanel('tiles')} />
            ) : panel === 'med' ? (
              <Picker tone="med" title={copy.med} spokenTitle={spoken(copy.med, PLAIN.med)} options={medOptions} columns={1} busy={busy} onClose={() => setPanel('tiles')} />
            ) : !live ? (
              shownWindow && shownEntries && <PastStats title={titleOf(shownWindow)} boxes={pastBoxes(shownWindow.kind, windowStats(shownWindow, shownEntries))} />
            ) : (
              <>
                {needs && <Moodlets needs={needs} />}
                {row && prediction && (
                  <WindowRow
                    row={row}
                    disclaimer={disclaimer(prediction.next, prediction.ageMonths).text}
                    spoken={spokenPrediction(prediction.next, now)}
                    onOpen={() => {
                      setEditing(null);
                      setLikely(nextSlot);
                    }}
                  />
                )}
                <Tiles tiles={tiles} busy={busy} skeleton={skeleton} needs={needs} />
              </>
            )}
          </View>
        </KeyboardAwareScrollView>
      </BehindSheet>
      {askingLockScreen && timerOf(askingLockScreen) && (
        <LockScreenSheet
          tracker={askingLockScreen}
          start={timerOf(askingLockScreen)!.start}
          onContinue={() => answerLockScreen(true)}
          onNotNow={() => answerLockScreen(false)}
        />
      )}
      {askingAdd && (
        <AddSheet
          now={now}
          bottle={lastBottle}
          solids={solids}
          ateLabel={ateLabel(childName, sex)}
          pending={adding}
          onSave={(draft) => void saveAdded(draft)}
          onClose={() => setAskingAdd(false)}
        />
      )}
      {askingToday && loaded && liveWindow && (
        <TodaySheet
          night={liveWindow.kind === 'night'}
          now={now}
          {...todaySheetTotals(loaded, liveWindow, sleepRunning, rhythm, bottle.amount, now)}
          entries={loaded}
          onEdit={(item) => {
            setAskingToday(false);
            setPanel('tiles');
            setEditing(null);
            // Opened on the window it's in, once that window's entries are loaded.
            const target = { kind: item.kind, entry: item.entry } as EditTarget;
            setWantAt({ time: Date.parse(item.at), edit: { key: `${item.kind}-${item.entry.id}` as RingKey, target } });
          }}
          onRecentDays={() => {
            setAskingToday(false);
            router.push('/recent-days');
          }}
          onClose={() => setAskingToday(false)}
        />
      )}
      {askingWhy && prediction && (
        <WhySheet
          next={prediction.next}
          ageMonths={prediction.ageMonths}
          when={(prediction.next.kind === 'bedtime' ? nextRow?.range : nextRow?.when) ?? ''}
          onClose={() => setAskingWhy(false)}
        />
      )}
      {askingChildren && <ChildrenSheetFor now={now} onClose={() => setAskingChildren(false)} />}
    </View>
  );
}

/**
 * The Today sheet's boxes and ml line: Recent days' top card so far (last night and today, or tonight),
 * with the running sleep. `defaultMl` stands in for feeds with no ml, as on Recent days.
 */
function todaySheetTotals(
  entries: EntriesByKind,
  live: DayWindow,
  running: Timer | null,
  rhythm: DayRhythm,
  defaultMl: number | undefined,
  now: Date,
) {
  const [card] = recentDays(live, windowsBefore(entries, rhythm, now, 1, running));
  const { from, to } = cardSpan(card, now);
  return { stats: cardStats(card, entries, running, now), drank: drankText(drank(entries.feeding, from, to, defaultMl)) };
}

/** The latest medicine logged, for its tile. */
function latestMedication(entries: EntriesByKind): { at: string } | null {
  const latest = entries.medication.reduce<EntriesByKind['medication'][number] | null>(
    (newest, entry) => (!newest || Date.parse(entry.time) > Date.parse(newest.time) ? entry : newest),
    null,
  );
  return latest && { at: latest.time };
}

/** While a timer runs and notifications are off: it isn't on the lock screen. */
function LockScreenLine({ onTurnOn }: { onTurnOn: () => void }) {
  return (
    <View className="flex-row items-center gap-2.5 px-1.5">
      <Text className="flex-1 text-caption font-bold text-muted">Not on your lock screen. Notifications are off.</Text>
      <InkButton label="Turn on" onPress={onTurnOn} />
    </View>
  );
}

/** The empty track while the first load is out. */
function RingSkeleton() {
  return (
    <View aria-hidden testID="skeleton-ring" className="flex-1 items-center justify-center">
      <View className="h-[264px] w-[264px] rounded-full border-[30px] border-line opacity-60" />
    </View>
  );
}
