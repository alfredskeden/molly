import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/ui';
import { useToast } from '@/features/toast/toast';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';

import { Glyph } from './Glyph';
import { useTheme } from './theme';
import { THEME_KEYS, THEMES, type ThemeKey } from './themes';

const DOTS = ['sleep-mid', 'feed-mid', 'diaper-mid'] as const;

/**
 * Settings' Theme sheet (design `1l`): the themes, each with its day and night halves. A tap applies
 * it at once and says so; it isn't part of Settings' Save.
 */
export function ThemeSheet({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const haptic = useHaptic();
  function choose(key: ThemeKey) {
    if (key === theme.look) return;
    haptic(HAPTICS.choose);
    theme.setLook(key);
    toast({ text: `Theme changed to ${THEMES[key].name}`, tone: 'diaper' });
  }
  return (
    <Sheet label="Theme" title="Theme" onScrimPress={onClose} scroll>
      <Text className="px-1 pb-2 text-sm font-bold text-muted">
        Tap one to use it right away. Every theme has a day and a night look and follows the Colours setting.
      </Text>
      <View role="radiogroup" accessibilityLabel="Theme" className="gap-2">
        {THEME_KEYS.map((key) => (
          <ThemeCard key={key} themeKey={key} chosen={theme.look === key} onChoose={() => choose(key)} />
        ))}
      </View>
    </Sheet>
  );
}

function ThemeCard({ themeKey, chosen, onChoose }: { themeKey: ThemeKey; chosen: boolean; onChoose: () => void }) {
  const { name, tagline, day, night, isNew } = THEMES[themeKey];
  return (
    <Pressable
      role="radio"
      aria-checked={chosen}
      accessibilityLabel={`${name}${isNew ? ', new' : ''}. ${tagline}`}
      onPress={onChoose}
      className={`min-h-[84px] flex-row items-center gap-3.5 rounded-mock border-2 bg-bg p-3 active:scale-[0.98] ${chosen ? 'border-accent' : 'border-transparent'}`}
    >
      <View aria-hidden className="flex-row gap-1">
        {[day, night].map((look, index) => (
          <View
            key={index}
            className="h-14 w-[30px] items-center justify-center gap-1 border border-line"
            style={{
              backgroundColor: look.palette.bg,
              borderTopLeftRadius: index === 0 ? 10 : 4,
              borderBottomLeftRadius: index === 0 ? 10 : 4,
              borderTopRightRadius: index === 0 ? 4 : 10,
              borderBottomRightRadius: index === 0 ? 4 : 10,
            }}
          >
            {DOTS.map((dot) => (
              <View key={dot} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: look.palette[dot] }} />
            ))}
          </View>
        ))}
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-x-2">
          <Text className="text-base font-display">{name}</Text>
          {/* The Ribbon design's badge: feed tones, 11 px capitals. */}
          {isNew && (
            <View className="rounded-[10px] bg-feed-bg px-2 py-0.5">
              <Text className="text-[11px] font-black uppercase tracking-[0.6px] text-feed-ink">New</Text>
            </View>
          )}
        </View>
        <Text className="text-caption font-bold text-muted">{tagline}</Text>
      </View>
      <View
        aria-hidden
        className={`h-7 w-7 items-center justify-center rounded-full border-2 ${chosen ? 'border-accent bg-accent' : 'border-line'}`}
      >
        {chosen && <Glyph name="check" size={18} color="on-accent" />}
      </View>
    </Pressable>
  );
}
