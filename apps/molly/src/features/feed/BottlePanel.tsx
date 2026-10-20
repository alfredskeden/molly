import { useReducer } from 'react';
import { View } from 'react-native';

import { CloseButton, InkButton, Panel, Text } from '@/components/ui';
import { Bow, useOrnaments } from '@/theme/Bow';
import { useTheme } from '@/theme/theme';

import { amountInput, startAmount } from './amount-input';
import { BottleAmount } from './BottleAmount';

/**
 * The panel under the ring after Bottle in a feed picker: the amount row (starting at the last bottle) and
 * Save. `onSave` saves the bottle now (Time feeds off) or stops the running feed as one.
 */
export function BottlePanel({
  title,
  amount,
  busy,
  onSave,
  onClose,
}: {
  title: string;
  amount: number | null;
  busy: boolean;
  onSave: (amount: number) => void;
  onClose: () => void;
}) {
  const [state, dispatch] = useReducer(amountInput, amount, startAmount);
  const { palette } = useTheme();
  const ornaments = useOrnaments();
  const chosen = state.amount;
  return (
    <Panel className="gap-3 px-4 pb-4 pt-3" label={title}>
      <View className="flex-row items-center justify-between">
        <View className="shrink flex-row items-center gap-2">
          {/* Ribbon: a small bow in the feed's colours, as on the pickers. */}
          {ornaments && <Bow size={24} color={palette['feed-mid']} shade={palette['feed-ink']} />}
          <Text role="heading" className="shrink text-title font-display text-feed-ink">
            {title}
          </Text>
        </View>
        <CloseButton onPress={onClose} />
      </View>
      <BottleAmount state={state} dispatch={dispatch} />
      <InkButton
        label="Save"
        accessibilityLabel={chosen === null ? 'Save, type an amount first' : `Save ${chosen} millilitres`}
        tone="feed"
        tall
        stretch
        off={chosen === null}
        pending={busy}
        pendingLabel="Saving…"
        onPress={() => {
          if (chosen !== null && !busy) onSave(chosen);
        }}
      />
    </Panel>
  );
}
