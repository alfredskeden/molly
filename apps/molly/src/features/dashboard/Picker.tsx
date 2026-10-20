import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { CloseButton, Panel, QuietButton, Text } from '@/components/ui';
import { Bow, useOrnaments } from '@/theme/Bow';
import { RibbonIcon, type RibbonKind } from '@/theme/RibbonIcon';
import { TrackerIcon } from '@/theme/TrackerIcon';
import { Icon, useHasIcons } from '@/theme/Icon';
import type { FilledSymbol } from '@/theme/symbols';
import { useTheme } from '@/theme/theme';
import type { IconSlot } from '@/theme/themes';

export type PickerTone = 'feed' | 'diaper' | 'med';

export type PickerOption = {
  label: string;
  /** When the label alone is ambiguous ("Both"). */
  spoken?: string;
  icon: FilledSymbol;
  /** The theme's picture instead (Safari), if it has one for this option. */
  slot?: IconSlot;
  /** Ribbon's picture for this option, drawn in a small circle (themes with ornaments). */
  ribbon?: RibbonKind;
  onPress: () => void;
};

const TONES = {
  feed: { title: 'text-feed-ink', solid: 'bg-feed-ink', onSolid: 'text-feed-bg', on: 'feed-bg', mid: 'feed-mid', ink: 'feed-ink' },
  diaper: { title: 'text-diaper-ink', solid: 'bg-diaper-ink', onSolid: 'text-diaper-bg', on: 'diaper-bg', mid: 'diaper-mid', ink: 'diaper-ink' },
  med: { title: 'text-med-ink', solid: 'bg-med-ink', onSolid: 'text-med-bg', on: 'med-bg', mid: 'med-mid', ink: 'med-ink' },
} as const;

/**
 * The card under the ring that asks one thing: `Stop and save as` (Left / Right / Both / Bottle, with
 * `Cancel feed`), `Diaper` (Wet / Dirty / Both) or `Medicine`. Each option acts at once.
 */
export function Picker({
  tone,
  title,
  spokenTitle,
  options,
  columns,
  cancel,
  extra,
  busy,
  onClose,
}: {
  tone: PickerTone;
  title: string;
  spokenTitle?: string;
  options: PickerOption[];
  columns: number;
  cancel?: { label: string; spoken?: string; onPress: () => void };
  /** A second quiet action beside `cancel` (the running feed's `Edit start`). */
  extra?: { label: string; onPress: () => void };
  busy: boolean;
  onClose: () => void;
}) {
  const colours = TONES[tone];
  const pictured = useHasIcons();
  const { palette } = useTheme();
  const ornaments = useOrnaments();
  return (
    <Panel className="gap-2.5 px-4 pb-4 pt-3" label={spokenTitle ?? title}>
      <View className="flex-row items-center justify-between">
        <View className="shrink flex-row items-center gap-2">
          {/* Ribbon: a small bow in the tracker's colours. */}
          {ornaments && <Bow size={24} color={palette[colours.mid]} shade={palette[colours.ink]} />}
          <Text role="heading" accessibilityLabel={spokenTitle} className={`shrink text-title font-display ${colours.title}`}>
            {title}
          </Text>
        </View>
        <CloseButton onPress={onClose} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={option.spoken}
            logName={option.label}
            disabled={busy}
            onPress={option.onPress}
            style={{ flexBasis: `${100 / columns - 3}%` }}
            className={`min-h-[60px] grow flex-row items-center justify-center gap-2 rounded-button px-2 shadow-button active:scale-[0.97] ${colours.solid}`}
          >
            {pictured && option.slot ? (
              <Icon slot={option.slot} color={palette[colours.on]} size={22} />
            ) : ornaments && option.ribbon ? (
              // Ribbon: the picture in a 40 px circle of the tracker's light tone, pulled into the button's padding.
              <View className="-ml-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette[colours.on] }}>
                <RibbonIcon
                  kind={option.ribbon}
                  size={30}
                  ink={palette[colours.ink]}
                  light={palette[colours.on]}
                  accent={ornaments.bow.color}
                />
              </View>
            ) : (
              <TrackerIcon name={option.icon} size={22} ribbonSize={26} color={colours.on} light={colours.ink} />
            )}
            <Text className={`text-base font-display ${colours.onSolid}`}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      {(cancel || extra) && (
        <View className="flex-row justify-center">
          {extra && <QuietButton label={extra.label} onPress={extra.onPress} />}
          {cancel && <QuietButton label={cancel.label} accessibilityLabel={cancel.spoken} onPress={cancel.onPress} />}
        </View>
      )}
    </Panel>
  );
}
