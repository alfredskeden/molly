import { adjustedTime, clockText, durationText, typedDigit, typedText, typedTime } from '@molly/core';
import { Link, router } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { adjustTime } from '@/actions/trackers';
import { BehindSheet, Sheet } from '@/components/sheet';
import { Spinner, Text } from '@/components/ui';
import { Avatar } from '@/features/children/Avatar';
import { failureToast, type Adjustable, type Toast, type ToastTone } from '@/features/dashboard/outcome-messages';
import { useClient, useRefreshAfterWrite } from '@/features/dashboard/queries';
import { useNow } from '@/features/dashboard/use-now';
import { answerStrength, HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { useOrnaments } from '@/theme/Bow';
import { Glyph } from '@/theme/Glyph';
import type { NeedsLook } from '@/theme/need-look';
import { useTheme } from '@/theme/theme';
import { THEMES } from '@/theme/themes';

const SHOWN_MS = 6000;

const ToastContext = createContext<{ show: (toast: Toast) => void; dismiss: () => void } | null>(null);

/** One toast at a time, over every signed-in screen, so it survives navigating between them. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [sheet, setSheet] = useState<Adjustable | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((next: Toast) => {
    clearTimeout(timeout.current);
    setToast(next);
    timeout.current = setTimeout(() => setToast(null), next.shownMs ?? SHOWN_MS);
  }, []);
  const dismiss = useCallback(() => {
    clearTimeout(timeout.current);
    setToast(null);
  }, []);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  function openAdjust(adjust: Adjustable) {
    dismiss();
    setSheet(adjust);
  }

  return (
    <ToastContext value={value}>
      <View className="flex-1">
        <BehindSheet sheetOpen={sheet !== null}>{children}</BehindSheet>
        {toast && !sheet && <ToastView toast={toast} onAdjust={openAdjust} onDismiss={dismiss} />}
        {sheet && <AdjustSheet adjust={sheet} onClose={() => setSheet(null)} onDone={show} />}
      </View>
    </ToastContext>
  );
}

export function useToast(): (toast: Toast) => void {
  return useToastContext().show;
}

/** For a sheet the toast would cover. */
export function useDismissToast(): () => void {
  return useToastContext().dismiss;
}

function useToastContext() {
  const context = use(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

/** Which need a saved entry's toast leads with in Life Sim. */
const NEED_OF: Record<Exclude<ToastTone, 'danger'>, keyof NeedsLook['words']['toastLeads']> = {
  sleep: 'sleep',
  feed: 'feed',
  diaper: 'diaper',
  med: 'medicine',
};

const DOTS: Record<ToastTone, string> = {
  sleep: 'bg-sleep-mid',
  feed: 'bg-feed-mid',
  diaper: 'bg-diaper-mid',
  med: 'bg-med-mid',
  danger: 'bg-danger',
};

function ToastView({
  toast,
  onAdjust,
  onDismiss,
}: {
  toast: Toast;
  onAdjust: (adjust: Adjustable) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const ornaments = useOrnaments();
  const { look, scheme, playful } = useTheme();
  const needs = THEMES[look][scheme].needs;
  // Ribbon's bow or Life Sim's green: the face or heart and the Edit words.
  const accent = ornaments?.toast ?? needs?.toast ?? null;
  const lead =
    needs && playful && toast.saved && toast.tone !== 'danger'
      ? needs.words.toastLeads[toast.saved === 'meal' ? 'meal' : NEED_OF[toast.tone]]
      : null;
  const actions = (
    <>
      {toast.adjust && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onAdjust(toast.adjust!)}
          className={`min-h-[44px] justify-center rounded-chip px-3 active:scale-[0.97] ${DOTS[toast.tone]}`}
        >
          <Text className="text-sm font-display text-on-mid">Adjust time</Text>
        </Pressable>
      )}
      {toast.undo && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onDismiss();
            toast.undo!();
          }}
          className={`min-h-[44px] justify-center rounded-chip px-3 active:scale-[0.97] ${DOTS[toast.tone]}`}
        >
          <Text className="text-sm font-display text-on-mid">Undo</Text>
        </Pressable>
      )}
      {toast.edit && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onDismiss();
            router.navigate({ pathname: '/', params: { edit: `${toast.edit!.kind}-${toast.edit!.id}` } });
          }}
          // Ribbon and Life Sim: plain words in their accent instead of a chip.
          className={`min-h-[44px] justify-center rounded-chip active:scale-[0.97] ${accent ? 'px-3.5' : `px-3 ${DOTS[toast.tone]}`}`}
        >
          {accent ? (
            <Text className="text-label font-black" style={{ color: accent }}>
              Edit
            </Text>
          ) : (
            <Text className="text-sm font-display text-on-mid">Edit</Text>
          )}
        </Pressable>
      )}
    </>
  );
  // More than one action gets a row of its own, so the words keep theirs (an instant feed: Adjust time and Edit).
  const actionRow = [toast.adjust, toast.undo, toast.edit].filter(Boolean).length > 1;
  return (
    <View
      // Polite: starts, stops and errors are announced once, after whatever is being read.
      accessibilityLiveRegion="polite"
      className="absolute left-4 right-4 rounded-box bg-ink py-1 pl-4 pr-1"
      // At the top, over the header's name and date: nothing there needs a tap right after an action, so the
      // toast never sits on a tile, a picker or the editor. The X takes it away sooner.
      style={{ top: insets.top + 6 }}
    >
      <View className="min-h-[44px] flex-row items-center gap-2.5">
        {toast.avatar ? (
          <Avatar name={toast.avatar.name} hue={toast.avatar.hue} size={28} />
        ) : toast.tone === 'danger' ? (
          <Glyph name="error" filled size={22} color="danger" />
        ) : ornaments ? (
          // Ribbon: a heart in the bow's colour.
          <Glyph name="favorite" filled size={22} color={ornaments.toast as `#${string}`} />
        ) : needs ? (
          // Life Sim: a happy face in its green.
          <Glyph name="sentiment_very_satisfied" filled size={22} color={needs.toast as `#${string}`} />
        ) : (
          <Glyph name="check_circle" filled size={22} color="diaper-mid" />
        )}
        <View className="flex-1 py-1.5">
          {/* Screen readers hear the plain words, without Life Sim's lead. */}
          <Text role="status" accessibilityLabel={lead ? toast.text : undefined} className="text-label font-extrabold text-bg">
            {lead ? `${lead} ${toast.text}` : toast.text}
          </Text>
          {toast.detail && <Text className="text-caption font-bold text-bg opacity-85">{toast.detail}</Text>}
          {toast.help && (
            <Link href={{ pathname: '/help', params: { topic: toast.help } }} asChild>
              <Pressable accessibilityRole="link" hitSlop={{ top: 6, bottom: 6 }} className="min-h-[36px] justify-center self-start active:opacity-70">
                <Text className="font-extrabold text-bg underline">How to fix</Text>
              </Pressable>
            </Link>
          )}
        </View>
        {!actionRow && actions}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          className="h-11 w-11 items-center justify-center active:opacity-70"
        >
          <Glyph name="close" size={20} color="bg" />
        </Pressable>
      </View>
      {actionRow && <View className="flex-row justify-end gap-2 pb-1 pr-2">{actions}</View>}
    </View>
  );
}

const AGO_CHIPS = [0, 5, 10, 15, 20, 30, 45, 60];

const INK: Record<Adjustable['tone'], { solid: string; onSolid: string; text: string }> = {
  sleep: { solid: 'bg-sleep-ink', onSolid: 'text-sleep-bg', text: 'text-sleep-ink' },
  feed: { solid: 'bg-feed-ink', onSolid: 'text-feed-bg', text: 'text-feed-ink' },
  diaper: { solid: 'bg-diaper-ink', onSolid: 'text-diaper-bg', text: 'text-diaper-ink' },
  med: { solid: 'bg-med-ink', onSolid: 'text-med-bg', text: 'text-med-ink' },
};

/**
 * The sheet's time: N minutes before now (chips, ±1), or an exact clock time the parent typed (`kept`,
 * four digits), which doesn't move as now does. `draft` holds the digits while the keyboard is up, drawn
 * over the faint rest of `before`, the time shown when typing began.
 */
type Choice = { minutesAgo: number; kept: string | null; draft: string | null; before: Date };

type ChoiceAction =
  | { type: 'ago'; minutesAgo: number }
  | { type: 'type'; before: Date }
  | { type: 'keys'; text: string }
  | { type: 'done' };

function choose(choice: Choice, action: ChoiceAction): Choice {
  switch (action.type) {
    case 'ago':
      return { ...choice, minutesAgo: Math.max(0, action.minutesAgo), kept: null, draft: null };
    case 'type':
      return choice.draft === null ? { ...choice, draft: '', before: action.before } : choice;
    case 'keys': {
      const draft = choice.draft ?? '';
      // Shorter is a backspace; anything else is keys added at the end (the caret is hidden and stays there).
      const next =
        action.text.length < draft.length
          ? draft.slice(0, -1)
          : action.text.startsWith(draft)
            ? [...action.text.slice(draft.length)].reduce(typedDigit, draft)
            : draft;
      return { ...choice, draft: next };
    }
    case 'done':
      // Fewer than four digits go back to the time shown before typing began.
      return { ...choice, kept: choice.draft?.length === 4 ? choice.draft : choice.kept, draft: null };
  }
}

function AdjustSheet({ adjust, onClose, onDone }: { adjust: Adjustable; onClose: () => void; onDone: (toast: Toast) => void }) {
  const client = useClient();
  const refresh = useRefreshAfterWrite();
  const now = useNow(1000);
  const [choice, dispatch] = useReducer(choose, undefined, () => ({
    minutesAgo: Math.max(0, Math.round((Date.now() - Date.parse(adjust.current)) / 60_000)),
    kept: null,
    draft: null,
    before: new Date(adjust.current),
  }));
  const [saving, setSaving] = useState(false);
  // Stops a second tap that lands before `saving` renders.
  const savingRef = useRef(false);
  const input = useRef<TextInput>(null);
  const haptic = useHaptic();
  const after = useMemo(() => (adjust.after ? new Date(adjust.after) : undefined), [adjust.after]);
  const fromChips = adjustedTime({ minutesAgo: choice.minutesAgo, now, after });
  // The typed digits that decide the time, if any; while fewer than four are typed there's no time yet.
  const digits = choice.draft ?? choice.kept;
  const time = digits === null ? fromChips : typedTime({ digits, now, after });
  const ink = INK[adjust.tone];

  // Android's back hides the keyboard without blurring the input: count it as done.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => input.current?.blur());
    return () => subscription.remove();
  }, []);

  function pickAgo(minutesAgo: number) {
    dispatch({ type: 'ago', minutesAgo });
    input.current?.blur();
  }

  const agoOf = (moment: Date) => Math.round((now.getTime() - moment.getTime()) / 60_000);
  /** Minutes before now that ±1 steps from: the time shown, or the one before typing began. */
  const stepFrom = digits === null ? choice.minutesAgo : agoOf(time instanceof Date ? time : choice.before);

  async function apply() {
    if (!(time instanceof Date)) return;
    // "Now" keeps the time Baby Buddy stamped: nothing to send.
    if (digits === null && choice.minutesAgo === 0) return onClose();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const outcome = await adjustTime(client, { target: adjust.target, time });
    haptic(answerStrength(outcome));
    await refresh();
    savingRef.current = false;
    setSaving(false);
    onClose();
    onDone(
      outcome.type === 'adjusted'
        ? { text: `Time set to ${clockText(new Date(outcome.time))}`, tone: adjust.tone }
        : failureToast(outcome.error, outcome.message),
    );
  }

  const agoText = (minutes: number) => (minutes <= 0 ? 'Now' : `${durationText(minutes * 60_000)} ago`);
  const under =
    time === 'beforeStart'
      ? 'Before it started'
      : digits === null
        ? agoText(choice.minutesAgo)
        : agoText(agoOf(time ?? choice.before));
  // While typing: the typed digits, then the faint rest of the time shown before.
  const typing = choice.draft === null ? null : typedText(choice.draft, choice.before);
  const clock = choice.kept !== null ? typedText(choice.kept, choice.before).typed : clockText(fromChips);
  const disabled = saving || !(time instanceof Date);

  return (
    <Sheet label="Adjust time" onScrimPress={onClose}>
        <View className="gap-0.5">
          <Text className="text-label font-extrabold text-muted">{adjust.title}</Text>
          <View className="relative self-start">
            {typing ? (
              <View aria-hidden className="flex-row">
                {typing.typed !== '' && (
                  <Text className={`text-5xl font-display leading-[52px] tracking-display-1_5 tabular-nums ${ink.text}`}>{typing.typed}</Text>
                )}
                <Text className={`text-5xl font-display leading-[52px] tracking-display-1_5 tabular-nums opacity-35 ${ink.text}`}>
                  {typing.faint}
                </Text>
              </View>
            ) : (
              <Text aria-hidden className={`text-5xl font-display leading-[52px] tracking-display-1_5 tabular-nums ${ink.text}`}>
                {clock}
              </Text>
            )}
            <TextInput
              ref={input}
              testID="typed-time"
              accessibilityLabel={`${adjust.after ? 'End' : 'Start'} time ${typing ? typing.typed + typing.faint : clock}`}
              accessibilityHint="Double tap to type a time"
              value={choice.draft ?? ''}
              onFocus={() => dispatch({ type: 'type', before: time instanceof Date ? time : choice.before })}
              onChangeText={(keys) => dispatch({ type: 'keys', text: keys })}
              onBlur={() => dispatch({ type: 'done' })}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={4}
              caretHidden
              contextMenuHidden
              underlineColorAndroid="transparent"
              // Over the time, unseen: it only takes the digits, the time under it draws them. Not opacity 0, which
              // Android leaves out of the accessibility tree (TalkBack couldn't reach it), and Android draws the
              // text even when its colour is transparent.
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: '#00000000', opacity: 0.01 }}
            />
          </View>
          <Text className={`text-label font-bold ${time === 'beforeStart' ? 'text-danger' : 'text-muted'}`}>{under}</Text>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {AGO_CHIPS.map((ago) => {
            const checked = digits === null && ago === choice.minutesAgo;
            return (
              <Pressable
                key={ago}
                role="radio"
                aria-checked={checked}
                onPress={() => {
                  haptic(HAPTICS.choose);
                  pickAgo(ago);
                }}
                className={`min-h-11 basis-[23%] grow items-center justify-center rounded-chip active:scale-[0.97] ${checked ? ink.solid : 'bg-bg'}`}
              >
                <Text className={`text-label font-extrabold ${checked ? ink.onSolid : ''}`}>{ago === 0 ? 'Now' : `${ago}m`}</Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row gap-2">
          <SheetButton label="1 min earlier" onPress={() => pickAgo(stepFrom + 1)} />
          <SheetButton label="1 min later" onPress={() => pickAgo(stepFrom - 1)} />
        </View>
        <Pressable
          accessibilityRole="button"
          aria-busy={saving}
          aria-disabled={disabled}
          disabled={disabled}
          onPress={apply}
          className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl active:scale-[0.98] ${ink.solid} ${disabled && !saving ? 'opacity-40' : ''}`}
        >
          {saving && <Spinner color={`${adjust.tone}-bg`} />}
          <Text className={`text-lg font-display ${ink.onSolid}`}>{saving ? 'Saving…' : 'Set time'}</Text>
        </Pressable>
    </Sheet>
  );
}

function SheetButton({ label, onPress }: { label: string; onPress: () => void }) {
  const haptic = useHaptic();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic(HAPTICS.step);
        onPress();
      }}
      className="min-h-12 flex-1 items-center justify-center rounded-button bg-bg active:scale-[0.97]"
    >
      <Text className="text-base font-extrabold">{label}</Text>
    </Pressable>
  );
}
