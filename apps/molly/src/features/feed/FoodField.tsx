import { TextInput, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { Glyph } from '@/theme/Glyph';
import { useTheme } from '@/theme/theme';

/**
 * What a meal was: the Solids panel's field (focused as it opens), the editor's and Add entry's. `label` is
 * what a screen reader says (the question or "What she ate").
 */
export function FoodField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  autoFocus?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <TextInput
      testID="food"
      accessibilityLabel={label}
      value={value}
      placeholder="e.g. Carrot purée"
      placeholderTextColor={palette.muted}
      onChangeText={onChange}
      autoFocus={autoFocus}
      autoCapitalize="sentences"
      returnKeyType="done"
      underlineColorAndroid="transparent"
      className="h-[60px] rounded-chip border-2 border-feed-mid bg-bg px-3.5 font-sans text-title font-bold text-ink"
    />
  );
}

/** The recent foods as chips: an on chip shows `✓` in the feed's colours, an off one `+`. */
export function FoodChips({ foods, chosen, onTap }: { foods: string[]; chosen: string[]; onTap: (food: string) => void }) {
  const haptic = useHaptic();
  return (
    <View className="flex-row flex-wrap gap-2">
      {foods.map((food) => {
        const on = chosen.includes(food);
        return (
          <Pressable
            key={food}
            role="checkbox"
            aria-checked={on}
            accessibilityLabel={food}
            logName="food chip"
            onPress={() => {
              haptic(HAPTICS.choose);
              onTap(food);
            }}
            className={`h-10 flex-row items-center gap-1 rounded-full border pl-2.5 pr-3.5 active:scale-[0.97] ${on ? 'border-feed-mid bg-feed-bg' : 'border-line bg-surface'}`}
          >
            <Glyph name={on ? 'check' : 'add'} size={18} color={on ? 'feed-ink' : 'muted'} />
            <Text className={`text-label font-bold ${on ? 'text-feed-ink' : 'text-ink'}`}>{food}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
