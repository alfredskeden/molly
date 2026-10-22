import { chosenFoods, tapFood } from '@molly/core';
import { useState } from 'react';
import { View } from 'react-native';

import { CloseButton, InkButton, Panel, Text } from '@/components/ui';
import { Bow, useOrnaments } from '@/theme/Bow';
import { useTheme } from '@/theme/theme';

import { FoodChips, FoodField } from './FoodField';

/**
 * The panel under the ring after Solids in a feed picker: the question, the food field (the keyboard opens
 * at once), the recent foods as chips and Save, off while the field is blank. `onSave` saves the meal now
 * (Time feeds off) or stops the running feed as one.
 */
export function SolidsPanel({
  title,
  spokenTitle,
  question,
  foods,
  busy,
  onSave,
  onClose,
}: {
  title: string;
  spokenTitle?: string;
  question: string;
  foods: string[];
  busy: boolean;
  onSave: (food: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const { palette } = useTheme();
  const ornaments = useOrnaments();
  const food = text.trim();
  return (
    <Panel className="gap-3 px-4 pb-4 pt-3" label={spokenTitle ?? title}>
      <View className="flex-row items-center justify-between">
        <View className="shrink flex-row items-center gap-2">
          {/* Ribbon: a small bow in the feed's colours, as on the pickers. */}
          {ornaments && <Bow size={24} color={palette['feed-mid']} shade={palette['feed-ink']} />}
          <Text role="heading" accessibilityLabel={spokenTitle} className="shrink text-title font-display text-feed-ink">
            {title}
          </Text>
        </View>
        <CloseButton onPress={onClose} />
      </View>
      <Text className="text-[22px] font-display text-ink">{question}</Text>
      <FoodField label={question} value={text} onChange={setText} autoFocus />
      {foods.length > 0 && <FoodChips foods={foods} chosen={chosenFoods(text, foods)} onTap={(chip) => setText(tapFood(text, foods, chip))} />}
      <InkButton
        label="Save"
        icon={{ name: 'check', filled: true }}
        accessibilityLabel={food ? `Save ${food}` : 'Save, write what was eaten first'}
        tone="feed"
        tall
        stretch
        off={!food}
        pending={busy}
        pendingLabel="Saving…"
        onPress={() => {
          if (food && !busy) onSave(food);
        }}
      />
    </Panel>
  );
}
