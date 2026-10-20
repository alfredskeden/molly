import { clockText, type LikelyDetail, type LikelySlot, type PastSleep } from '@molly/core';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { CloseButton, InkButton, Panel, QuietButton, Text } from '@/components/ui';
import { fill, PLAIN, spoken, type Copy } from '@/theme/copy';
import { Glyph } from '@/theme/Glyph';
import { TrackerIcon } from '@/theme/TrackerIcon';
import { useCopy } from '@/theme/theme';

/** The reminder bell (Android): set or not, and whether the window's start has passed. */
export type Bell = { on: boolean; disabled: boolean; onPress: () => void };

/** `Nap 2 likely` / `Bedtime likely` in the theme's words. */
export function likelyTitle(copy: Copy, slot: LikelySlot): string {
  return slot === 'bedtime' ? copy.likelyBedtime : fill(copy.likelyNap, { n: slot });
}

/** A later sleep's name: `Nap 3` / `Bedtime`, or `Then nap 3` as the first of the list when there's no heading. */
function laterName(copy: Copy, slot: LikelySlot, first: boolean): string {
  const name = slot === 'bedtime' ? copy.likelyLaterBedtime : fill(copy.likelyLaterNap, { n: slot });
  return first && copy.likelyLaterHeading === null ? `Then ${name.charAt(0).toLowerCase()}${name.slice(1)}` : name;
}

const lead = (word: string | null, text: string) => (word ? `${word} ${text}` : text);

/**
 * The panel for a tapped likely sleep (design `Molly Nap Detail` 2b), in place of the window row and tiles
 * as the editor is: when it's likely, how it went yesterday and usually, the rest of the day, the disclaimer
 * with Why (next sleep only), the bell, Start sleep and Skip (next nap only). Labels take the theme's words;
 * times, lengths and the disclaimer never do, and screen readers hear Classic's.
 */
export function LikelyPanel({
  detail,
  disclaimer,
  onWhy,
  onSkip,
  onStart,
  bell,
  onClose,
}: {
  detail: LikelyDetail;
  /** `Estimate · not medical advice`, or the age-only one. */
  disclaimer: string;
  onWhy: (() => void) | null;
  onSkip: (() => void) | null;
  /** Null while a sleep runs. */
  onStart: (() => void) | null;
  /** Null on web. */
  bell: Bell | null;
  onClose: () => void;
}) {
  const copy = useCopy();
  const title = likelyTitle(copy, detail.slot);
  const plainTitle = likelyTitle(PLAIN, detail.slot);
  const past = (label: string, plain: string, sleep: PastSleep | null) =>
    sleep && { label, plain, value: sleep.length ? `${sleep.start} · ${lead(copy.likelyLengthLead, sleep.length)}` : sleep.start };
  const history = [past(copy.likelyYesterday, PLAIN.likelyYesterday, detail.yesterday), past(copy.likelyUsually, PLAIN.likelyUsually, detail.usually)].filter(
    (row) => row !== null,
  );
  const start = clockText(detail.start);
  const bellWords = bell?.on ? copy.likelyBellOn : copy.likelyBellOff;
  return (
    <Panel className="gap-3 px-4 pb-4 pt-3.5" label={plainTitle}>
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-button bg-sleep-bg">
          <TrackerIcon name="bedtime" size={26} ribbonSize={30} color="sleep-ink" light="sleep-bg" />
        </View>
        <View className="flex-1">
          <Text role="heading" accessibilityLabel={spoken(title, plainTitle)} className="text-lg font-display">
            {title}
          </Text>
          <Text className="text-caption font-bold tabular-nums text-sleep-ink">{`${lead(copy.likelyRangeLead, detail.range)} · ${detail.when}`}</Text>
        </View>
        <CloseButton onPress={onClose} />
      </View>

      {history.length > 0 && (
        <View className="gap-1.5">
          {history.map((row) => (
            <View key={row.plain} accessible accessibilityLabel={`${row.plain} ${row.value}`} className="flex-row flex-wrap justify-between gap-x-2">
              <Text className="text-label font-bold text-muted">{row.label}</Text>
              <Text className="text-label font-extrabold tabular-nums">{row.value}</Text>
            </View>
          ))}
        </View>
      )}
      {history.length > 0 && detail.later.length > 0 && <View className="h-px bg-line" />}

      {detail.later.length > 0 && (
        <View className="gap-1.5">
          {copy.likelyLaterHeading && <Text className="text-label font-bold text-muted">{copy.likelyLaterHeading}</Text>}
          {detail.later.map((later, index) => (
            <View
              key={later.slot}
              accessible
              accessibilityLabel={`${laterName(PLAIN, later.slot, index === 0)} ${later.range.replace(' – ', ' to ')}`}
              className="flex-row items-center gap-2.5"
            >
              <View className="h-3 w-3 rounded-full border-2 border-dashed border-sleep-mid bg-sleep-bg" />
              <Text className="flex-1 text-label font-bold">{laterName(copy, later.slot, index === 0)}</Text>
              <Text className="text-label font-extrabold tabular-nums">{later.range}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-xs font-bold text-muted">
          {detail.later.length > 0 ? `Later times shift as you log · ${disclaimer}` : disclaimer}
        </Text>
        {onWhy && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Why this window?"
            onPress={onWhy}
            className="-my-2 min-h-12 justify-center px-2 active:opacity-70"
          >
            <Text className="text-caption font-extrabold text-sleep-ink">{copy.likelyWhy}</Text>
          </Pressable>
        )}
      </View>

      {(bell || onStart) && (
        <View className="flex-row gap-2">
          {bell && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={bell.on ? `Reminder set for ${start}` : `Remind me at ${start}`}
              accessibilityState={{ checked: bell.on, disabled: bell.disabled }}
              disabled={bell.disabled}
              onPress={bell.onPress}
              className={`h-[52px] flex-row items-center justify-center gap-1.5 rounded-button active:scale-[0.97] ${bellWords ? 'flex-1 px-2' : 'w-[52px]'} ${bell.on ? 'bg-sleep-bg' : 'bg-bg'} ${bell.disabled ? 'opacity-50' : ''}`}
            >
              {bell.on ? <Glyph name="notifications" filled size={22} color="sleep-ink" /> : <Glyph name="notifications" size={22} color="ink" />}
              {bellWords && (
                <Text numberOfLines={1} className={`shrink text-caption font-extrabold ${bell.on ? 'text-sleep-ink' : ''}`}>
                  {fill(bellWords, { t: start })}
                </Text>
              )}
            </Pressable>
          )}
          {onStart && (
            <View className={bellWords ? 'flex-[1.4]' : 'flex-1'}>
              <InkButton
                tone="sleep"
                stretch
                label={copy.startSleep}
                accessibilityLabel={spoken(copy.startSleep, PLAIN.startSleep)}
                icon={{ name: 'bedtime', filled: true }}
                onPress={onStart}
              />
            </View>
          )}
        </View>
      )}
      {onSkip && (
        <View className="-mb-2 -mt-1 flex-row">
          <QuietButton
            label={copy.likelySkip}
            accessibilityLabel={`Skip ${plainTitle.replace(/ likely$/, '').toLowerCase()}`}
            onPress={onSkip}
          />
        </View>
      )}
    </Panel>
  );
}
