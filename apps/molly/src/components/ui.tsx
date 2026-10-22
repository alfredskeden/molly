import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Text as NativeText,
  ScrollView,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import type { HelpTopic } from '@/features/help/topics';
import type { Message } from '@/features/onboarding/messages';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { Glyph } from '@/theme/Glyph';
import { Icon, useHasIcons } from '@/theme/Icon';
import { TrackerIcon } from '@/theme/TrackerIcon';
import type { FilledSymbol, OutlinedSymbol } from '@/theme/symbols';
import { useTheme } from '@/theme/theme';
import type { IconSlot } from '@/theme/themes';
import type { Palette } from '@/theme/tokens';

export type Tone = 'neutral' | 'sleep' | 'feed' | 'diaper' | 'med';

const HAS_COLOR = /(^|\s)text-(ink|muted|danger|bg|surface|on-mid|accent|on-accent|sleep-|feed-|diaper-|med-|child-|grow-|warm-|hot-|white)/;

/**
 * The theme's body face in its ink unless the caller picks a colour. Use it instead of React Native's Text.
 * `font-display` switches to the display face and weight (titles, big numbers).
 */
export function Text({ className = '', ...props }: TextProps & { className?: string }) {
  return <NativeText className={`font-sans ${HAS_COLOR.test(className) ? '' : 'text-ink '}${className}`} {...props} />;
}

/**
 * `footer` stays put under the scrolling content (the edit screen's Save). `backdrop` is drawn behind the
 * top of the content and scrolls with it (the dashboard's header pattern).
 */
export function Screen({ children, footer, backdrop }: { children: ReactNode; footer?: ReactNode; backdrop?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const scroll = (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="px-4"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: footer ? 24 : insets.bottom + 48 }}
      // Without this, the first tap on a button while the keyboard is open only closes the keyboard.
      keyboardShouldPersistTaps="handled"
    >
      {backdrop}
      {children}
    </ScrollView>
  );
  if (!footer) return scroll;
  return (
    <View className="flex-1 bg-bg">
      {scroll}
      <View className="border-t border-line bg-bg px-4 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        {footer}
      </View>
    </View>
  );
}

/** `spoken`: the plain title for screen readers, when `children` is a theme's word. */
export function Title({ children, spoken }: { children: ReactNode; spoken?: string }) {
  return (
    <Text role="heading" accessibilityLabel={spoken} className="mb-4 text-[28px] font-display tracking-display-0_5">
      {children}
    </Text>
  );
}

/** Back to the screen underneath, or the dashboard when this one was opened on its own (a reload, a deep link). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Full class names, spelled out so Tailwind finds them.
const SOLID: Record<Tone, string> = {
  neutral: 'bg-accent',
  sleep: 'bg-sleep-ink',
  feed: 'bg-feed-ink',
  diaper: 'bg-diaper-ink',
  med: 'bg-med-ink',
};
/** `SOLID`'s fill as a palette colour. */
const SOLID_FILL: Record<Tone, keyof Palette> = { neutral: 'accent', sleep: 'sleep-ink', feed: 'feed-ink', diaper: 'diaper-ink', med: 'med-ink' };
const ON_SOLID: Record<Tone, string> = {
  neutral: 'text-on-accent',
  sleep: 'text-sleep-bg',
  feed: 'text-feed-bg',
  diaper: 'text-diaper-bg',
  med: 'text-med-bg',
};
const OUTLINE: Record<Tone, string> = {
  neutral: 'border-card border-edge bg-surface',
  sleep: 'border-2 border-sleep-ink bg-sleep-bg',
  feed: 'border-2 border-feed-ink bg-feed-bg',
  diaper: 'border-2 border-diaper-ink bg-diaper-bg',
  med: 'border-2 border-med-ink bg-med-bg',
};
const ON_OUTLINE: Record<Tone, string> = {
  neutral: 'text-ink',
  sleep: 'text-sleep-ink',
  feed: 'text-feed-ink',
  diaper: 'text-diaper-ink',
  med: 'text-med-ink',
};

type Variant = 'primary' | 'outline' | 'quiet' | 'destructive';

/** The label's colour as a palette key, for an icon beside it. */
function labelColor(variant: Variant, tone: Tone): keyof Palette {
  const bg = tone === 'neutral' ? 'on-accent' : (`${tone}-bg` as const);
  const ink = tone === 'neutral' ? 'ink' : (`${tone}-ink` as const);
  return variant === 'primary' ? bg : variant === 'destructive' ? 'danger' : ink;
}

function buttonClasses(variant: Variant, tone: Tone) {
  switch (variant) {
    case 'primary':
      return { box: `shadow-button ${SOLID[tone]}`, text: ON_SOLID[tone] };
    case 'outline':
      return { box: `shadow-button ${OUTLINE[tone]}`, text: ON_OUTLINE[tone] };
    case 'quiet':
      return { box: 'bg-bg', text: 'text-ink' };
    case 'destructive':
      return { box: '', text: 'text-danger' };
  }
}

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  tone = 'neutral',
  grow,
  display,
  icon,
  accessibilityLabel,
  pending,
  pendingLabel,
}: {
  label: string;
  /** When the visible label is ambiguous on its own ("Both"). */
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  tone?: Tone;
  /** Share a Row's width with the other buttons. */
  grow?: boolean;
  /** The label in the theme's display face (the edit screen's Save). */
  display?: boolean;
  /**
   * The theme's picture for this button, if it has pictures (Safari): beside the label, or above a smaller
   * one when `stacked` (the diaper buttons).
   */
  icon?: { slot: IconSlot; stacked?: boolean };
  /**
   * The tap is on its way to Baby Buddy (for buttons without an optimistic update): a spinner, `pendingLabel`,
   * no further taps. Not dimmed like `disabled`: it's working, not unavailable.
   */
  pending?: boolean;
  pendingLabel?: string;
}) {
  const { box, text } = buttonClasses(variant, tone);
  const { palette } = useTheme();
  const pictured = useHasIcons() && icon !== undefined && !pending;
  const stacked = pictured && icon.stacked;
  const ink = labelColor(variant, tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pending ? undefined : accessibilityLabel}
      logName={label}
      aria-busy={pending === true}
      disabled={disabled || pending}
      onPress={onPress}
      // Scales on press, before the network answers.
      className={`${grow ? 'flex-1 ' : ''}min-h-14 items-center justify-center rounded-button px-3 active:scale-[0.97] ${pictured ? (stacked ? 'gap-px py-1' : 'flex-row gap-1.5') : ''} ${pending ? 'flex-row gap-2' : ''} ${box} ${disabled && !pending ? 'opacity-50' : ''}`}
    >
      {pictured && <Icon slot={icon.slot} color={palette[ink]} size={stacked ? 28 : 22} />}
      {pending && <Spinner color={ink} />}
      <Text
        className={`text-center ${stacked ? 'text-caption leading-[15px]' : 'text-title'} ${display || variant === 'primary' ? 'font-display-button' : 'font-extrabold'} ${text}`}
      >
        {pending ? (pendingLabel ?? label) : label}
      </Text>
    </Pressable>
  );
}

/** The small spinner of a pending button, in its label's colour. */
export function Spinner({ color }: { color: keyof Palette }) {
  const { palette } = useTheme();
  return <ActivityIndicator size="small" color={palette[color]} />;
}

const TONES = {
  ok: { box: 'bg-diaper-bg', text: 'text-diaper-ink' },
  info: { box: 'bg-sleep-bg', text: 'text-sleep-ink' },
  error: { box: 'border border-danger bg-surface', text: 'text-danger' },
};

export function Banner({ text, tone, help }: { text: string; tone: keyof typeof TONES; help?: HelpTopic }) {
  return (
    <View accessibilityRole="alert" className={`mb-3 rounded-button p-4 ${TONES[tone].box}`}>
      <Text className={`text-label font-bold ${TONES[tone].text}`}>{text}</Text>
      {help && <HelpLink topic={help} className={TONES[tone].text} />}
    </View>
  );
}

function HelpLink({ topic, className }: { topic: HelpTopic; className: string }) {
  return (
    <Link href={{ pathname: '/help', params: { topic } }} asChild>
      <Pressable accessibilityRole="link" hitSlop={4} className="mt-1 min-h-[44px] justify-center self-start">
        <Text className={`font-extrabold underline ${className}`}>How to fix</Text>
      </Pressable>
    </Link>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <Text className="mb-2 px-1 text-caption font-extrabold text-muted">{children}</Text>;
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  const { palette } = useTheme();
  return (
    <View className="mb-4">
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={palette.muted}
        className="min-h-[52px] rounded-chip border border-line bg-bg px-3.5 py-3 font-sans text-title font-bold text-ink"
        {...input}
      />
    </View>
  );
}

export function MessageBox({ message }: { message: Message }) {
  return (
    <View accessibilityRole="alert" className="mb-3 rounded-button border border-danger bg-surface p-4">
      <Text className="text-label font-extrabold text-danger">{message.title}</Text>
      {message.hints?.map((hint) => (
        <Text key={hint} className="mt-1 font-semibold text-danger">
          • {hint}
        </Text>
      ))}
      {message.help && <HelpLink topic={message.help} className="text-danger" />}
    </View>
  );
}

// ── The ring redesign's controls (plans/implan-ring-redesign, design `Molly Ring v4`) ──────────────────────

/** Text in a control of fixed size (a segment, a step button) grows this much at most with the system font size. */
export const FIXED_SCALE = 1.3;

/**
 * The header's 48 px square buttons: outlined on the surface, or filled in the accent (`ink`: Add). `disabled`
 * dims it (the pager's `‹` with nothing older) and announces it as unavailable.
 */
export function IconButton({
  icon,
  label,
  onPress,
  ink,
  size,
  disabled,
  pending,
}: {
  icon: OutlinedSymbol;
  /** Spoken: the button shows only its glyph. */
  label: string;
  onPress: () => void;
  ink?: boolean;
  /** The glyph's, when not the header's. */
  size?: number;
  disabled?: boolean;
  /** Waiting on what the press asked for: a spinner in place of the glyph. */
  pending?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!pending }}
      disabled={disabled}
      onPress={onPress}
      className={`h-12 w-12 items-center justify-center rounded-button ${disabled ? 'opacity-30' : 'active:scale-[0.97]'} ${ink ? 'bg-accent shadow-button' : 'border-card border-edge bg-surface'}`}
    >
      {pending ? <Spinner color={ink ? 'on-accent' : 'ink'} /> : <Glyph name={icon} size={size ?? (ink ? 26 : 22)} color={ink ? 'on-accent' : 'ink'} />}
    </Pressable>
  );
}

/** A close X in a card or sheet header: 48 px, muted. */
export function CloseButton({ onPress, label = 'Close' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="-mr-2 h-12 w-12 items-center justify-center active:opacity-70"
    >
      <Glyph name="close" size={22} color="muted" />
    </Pressable>
  );
}

/**
 * The design's solid buttons: `Done`, `Back to now` (with `icon`), the sticky `Save changes` (`tall`). Filled in
 * the accent, or in a tracker's ink with `tone`. `off`: the greyed `Saved` look, still pressable.
 */
export function InkButton({
  label,
  onPress,
  icon,
  tone = 'neutral',
  tall,
  stretch,
  off,
  pending,
  pendingLabel,
  accessibilityLabel,
  trailing,
}: {
  label: string;
  onPress: () => void;
  icon?: { name: FilledSymbol; filled: true } | { name: OutlinedSymbol; filled?: false };
  /** A glyph after the label: the pager's `Today ›`. */
  trailing?: OutlinedSymbol;
  tone?: Tone;
  tall?: boolean;
  stretch?: boolean;
  off?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  accessibilityLabel?: string;
}) {
  const ink = off ? 'muted' : labelColor('primary', tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pending ? undefined : accessibilityLabel}
      logName={label}
      aria-busy={pending === true}
      disabled={pending}
      onPress={onPress}
      className={`flex-row items-center justify-center ${trailing ? 'gap-0.5' : 'gap-2'} rounded-button active:scale-[0.97] ${tall ? 'h-14' : 'h-12'} ${stretch ? 'self-stretch' : icon ? 'self-center pl-3.5 pr-5' : trailing ? 'pl-3.5 pr-1.5' : 'px-7'} ${off ? 'bg-line' : `shadow-button ${SOLID[tone]}`}`}
    >
      {pending ? (
        <Spinner color={ink} />
      ) : (
        icon &&
        (icon.filled ? (
          // Ribbon's picture on the button's fill, its cheeks and bows in the label's colour (design: Start sleep).
          <TrackerIcon name={icon.name} size={tall ? 22 : 20} ribbonSize={26} color={ink} light={off ? 'line' : SOLID_FILL[tone]} accent={ink} />
        ) : (
          <Glyph name={icon.name} size={tall ? 22 : 20} color={ink} />
        ))
      )}
      <Text className={`font-display-button ${tall ? 'text-title' : icon || trailing ? 'text-label' : 'text-base'} ${off ? 'text-muted' : ON_SOLID[tone]}`}>
        {pending ? (pendingLabel ?? label) : label}
      </Text>
      {trailing && !pending && <Glyph name={trailing} size={26} color={ink} />}
    </Pressable>
  );
}

/** A quiet text button, 48 px tall: `Skip`, `Cancel feed`, `Delete` (`danger`, with its bin). */
export function QuietButton({
  label,
  onPress,
  danger,
  accessibilityLabel,
  pending,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  accessibilityLabel?: string;
  pending?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      logName={label}
      aria-busy={pending === true}
      disabled={pending}
      onPress={onPress}
      className={`h-12 flex-row items-center gap-1.5 active:opacity-70 ${danger ? 'px-2' : 'px-4'}`}
    >
      {pending ? <Spinner color={danger ? 'danger' : 'muted'} /> : danger && <Glyph name="delete" size={20} color="danger" />}
      <Text className={`text-label font-extrabold ${danger ? 'text-danger' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

/** The design's card: surface, line border, card corners. Padding is the caller's (`className`). */
export function Panel({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <View accessibilityLabel={label} className={`rounded-card border-card border-edge bg-surface shadow-card ${className}`}>
      {children}
    </View>
  );
}

/** A grey label over a group of cards (`Children`, `For everyone`). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text className="-mb-1.5 px-1 text-sm font-display text-muted">{children}</Text>;
}

const SEGMENT_INK: Record<Tone, string> = { ...ON_OUTLINE, neutral: 'text-ink' };

/**
 * The design's segmented control: options on the page colour, the chosen one raised on the surface in the
 * tone's ink (`Left / Right / Both / Bottle`, `Follow the phone / Day / Night`).
 */
export function Segment<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'neutral',
  small,
}: {
  /** Spoken: what the choice is. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  tone?: Tone;
  /** The design's 14 px labels (Settings' Colours, Bottle) instead of 15. */
  small?: boolean;
}) {
  const haptic = useHaptic();
  return (
    <View role="radiogroup" accessibilityLabel={label} className="flex-row gap-1 rounded-button bg-bg p-1">
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={chosen}
            onPress={() => {
              haptic(HAPTICS.choose);
              onChange(option.value);
            }}
            // 48 high: Android's smallest tap target, without counting on slop.
            className={`min-h-12 flex-1 items-center justify-center rounded-inner px-0.5 py-1 ${chosen ? 'bg-surface' : 'active:bg-line'}`}
          >
            <Text
              numberOfLines={2}
              maxFontSizeMultiplier={FIXED_SCALE}
              className={`text-center ${small ? 'text-sm leading-4' : 'text-label leading-[18px]'} font-extrabold ${chosen ? SEGMENT_INK[tone] : 'text-muted'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A switch row: title, a line under it, the design's 52 × 32 track. `last` drops the divider. */
export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  last,
  children,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
  /** Under the subtitle (the live-updates line). */
  children?: ReactNode;
}) {
  const haptic = useHaptic();
  return (
    <View className={last ? '' : 'border-b border-line'}>
      <Pressable
        role="switch"
        aria-checked={value}
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        onPress={() => {
          haptic(HAPTICS.choose);
          onChange(!value);
        }}
        className="min-h-[68px] flex-row items-center gap-3 py-2 active:opacity-70"
      >
        <View className="flex-1">
          <Text className="text-base font-extrabold">{title}</Text>
          {subtitle && <Text className="text-caption font-bold text-muted">{subtitle}</Text>}
        </View>
        {/* Fixed size: a long subtitle mustn't squeeze the track under the knob. */}
        <View className={`h-8 w-[52px] shrink-0 rounded-full ${value ? 'bg-toggle' : 'bg-line'}`} style={{ width: 52, height: 32 }}>
          <View className="absolute top-[3px] h-[26px] w-[26px] rounded-full bg-surface" style={{ left: value ? 23 : 3 }} />
        </View>
      </Pressable>
      {children}
    </View>
  );
}

/** A row that opens something: title, a line under it, an optional value on the right and a chevron. */
export function LinkRow({
  title,
  subtitle,
  value,
  valueClassName = 'text-muted',
  onPress,
  last,
  leading,
  valueLeading,
  spoken,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  valueClassName?: string;
  onPress: () => void;
  last?: boolean;
  /** Before the title (a child's avatar). */
  leading?: ReactNode;
  /** Before the value (Ribbon's bow on the Theme row). */
  valueLeading?: ReactNode;
  /** What a screen reader says instead of the title and value. */
  spoken?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken ?? [title, value].filter(Boolean).join(', ')}
      accessibilityHint={subtitle}
      onPress={onPress}
      className={`flex-row items-center gap-3 active:opacity-70 ${leading ? 'min-h-[72px] gap-3.5' : 'min-h-[68px]'} ${last ? '' : 'border-b border-line'}`}
    >
      {leading}
      <View className="flex-1 py-2">
        <Text className={leading ? 'text-title font-display' : 'text-base font-extrabold'}>{title}</Text>
        {subtitle && <Text className="text-caption font-bold text-muted">{subtitle}</Text>}
      </View>
      {valueLeading}
      {value && <Text className={`text-label font-extrabold ${valueClassName}`}>{value}</Text>}
      <Glyph name="chevron_right" size={leading ? 22 : 20} color="muted" />
    </Pressable>
  );
}

/**
 * A value with two step buttons (`Start 09:32 −5 +5`, `Day starts 07:00 −15 +15`). `spoken` names what's
 * stepped for screen readers (`Start`, `5 minutes`): "5 minutes earlier, Start".
 */
export function StepperRow({
  label,
  value,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
  spokenMinus,
  spokenPlus,
  labelWidth = 52,
  big,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  /** The buttons' text: `−5`, `+15`. */
  minusLabel: string;
  plusLabel: string;
  spokenMinus: string;
  spokenPlus: string;
  labelWidth?: number;
  /** 28 px value (the editor) instead of 26 (settings). */
  big?: boolean;
}) {
  const haptic = useHaptic();
  const step = (onStep: () => void) => () => {
    haptic(HAPTICS.step);
    onStep();
  };
  return (
    <View className="flex-row items-center gap-2">
      <Text maxFontSizeMultiplier={FIXED_SCALE} numberOfLines={2} className="text-sm font-extrabold text-muted" style={{ width: labelWidth }}>
        {label}
      </Text>
      <Text
        maxFontSizeMultiplier={FIXED_SCALE}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        accessibilityLabel={`${label} ${value}`}
        className={`flex-1 font-display tabular-nums ${big ? 'text-[28px] tracking-display-0_5' : 'text-[26px]'}`}
      >
        {value}
      </Text>
      <StepButton label={minusLabel} spoken={spokenMinus} onPress={step(onMinus)} />
      <StepButton label={plusLabel} spoken={spokenPlus} onPress={step(onPlus)} />
    </View>
  );
}

/** One of a stepper's buttons (`−5`, `+15`): 48 × 60 px. */
export function StepButton({ label, spoken, onPress }: { label: string; spoken: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      className="h-12 w-[60px] items-center justify-center rounded-chip bg-bg active:scale-[0.97]"
    >
      <Text maxFontSizeMultiplier={FIXED_SCALE} className="text-base font-display">
        {label}
      </Text>
    </Pressable>
  );
}

/** The sticky bar under Settings and the child screen: `Save changes` while there's a draft, else `Saved`. */
export function SaveBar({ dirty, onSave, pending }: { dirty: boolean; onSave: () => void; pending?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-t border-line bg-bg px-4 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
      <InkButton
        label={dirty ? 'Save changes' : 'Saved'}
        onPress={onSave}
        icon={{ name: 'check' }}
        tall
        stretch
        off={!dirty}
        pending={pending}
        pendingLabel="Saving…"
      />
    </View>
  );
}

/** The design's `‹ Back` at the top of a screen (or `‹ Settings` on a child's screen). */
export function BackLink({ label = 'Back', onPress = goBack, spoken }: { label?: string; onPress?: () => void; spoken?: string }) {
  return (
    <View className="flex-row px-3 pt-1.5">
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={spoken ?? (label === 'Back' ? 'Back' : `Back to ${label}`)}
        onPress={onPress}
        className="h-12 flex-row items-center gap-0.5 pl-1 pr-3.5 active:opacity-70"
      >
        <Glyph name="chevron_left" size={28} color="ink" />
        <Text className="text-base font-extrabold">{label}</Text>
      </Pressable>
    </View>
  );
}

/** A screen's big title under its back link. `spoken`: the plain words when the title is a theme's. */
export function ScreenTitle({ children, spoken }: { children: ReactNode; spoken?: string }) {
  return (
    <Text role="heading" accessibilityLabel={spoken} className="px-[22px] pb-3.5 pt-1 text-[28px] font-display tracking-display-0_5">
      {children}
    </Text>
  );
}
