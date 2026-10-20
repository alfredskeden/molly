import { AMOUNT_STEP } from '@molly/core';
import { useEffect, useRef, type Dispatch } from 'react';
import { Keyboard, TextInput, View } from 'react-native';

import { FIXED_SCALE, StepButton, Text } from '@/components/ui';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';

import type { AmountAction, AmountState } from './amount-input';

const NUMBER = 'text-5xl font-display leading-[52px] tracking-display-1_5 tabular-nums text-feed-ink';

/**
 * A bottle's amount: −5, the big amount, +5. Tapping the amount opens the number keyboard; the digits fill
 * it over the faint amount shown before (as Adjust time's typed time). State lives with the caller
 * (`useReducer(amountInput, amount, startAmount)`), whose Save sends `state.amount`.
 */
export function BottleAmount({ state, dispatch }: { state: AmountState; dispatch: Dispatch<AmountAction> }) {
  const input = useRef<TextInput>(null);
  const haptic = useHaptic();

  // Android's back hides the keyboard without blurring the input: count it as done.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => input.current?.blur());
    return () => subscription.remove();
  }, []);

  function step(direction: -1 | 1) {
    haptic(HAPTICS.step);
    input.current?.blur();
    dispatch({ type: 'step', direction });
  }

  const typing = state.draft !== null;
  const shown = typing ? state.draft || '' : String(state.amount ?? '');
  // While nothing is typed yet, the amount from before shows faint.
  const faint = typing && state.draft === '' && state.before !== null ? String(state.before) : '';
  const spokenAmount = state.amount === null ? 'none' : `${state.amount} millilitres`;

  return (
    <View className="flex-row items-center gap-2">
      <StepButton label={`−${AMOUNT_STEP}`} spoken={`Less: −${AMOUNT_STEP} ml`} onPress={() => step(-1)} />
      <View className="relative flex-1 flex-row items-baseline justify-center gap-1.5">
        <Text aria-hidden maxFontSizeMultiplier={FIXED_SCALE} numberOfLines={1} className={`${NUMBER} ${faint ? 'opacity-35' : ''}`}>
          {faint || shown}
        </Text>
        <Text aria-hidden maxFontSizeMultiplier={FIXED_SCALE} className="text-title font-display text-feed-ink">
          ml
        </Text>
        <TextInput
          ref={input}
          testID="bottle-amount"
          accessibilityLabel={`Amount ${spokenAmount}`}
          accessibilityHint="Double tap to type an amount"
          value={state.draft ?? ''}
          onFocus={() => dispatch({ type: 'focus' })}
          onChangeText={(text) => dispatch({ type: 'keys', text })}
          onBlur={() => dispatch({ type: 'blur' })}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={3}
          caretHidden
          contextMenuHidden
          underlineColorAndroid="transparent"
          // Over the amount, unseen: it only takes the digits, the amount under it draws them. Not opacity 0,
          // which Android leaves out of the accessibility tree, and Android draws transparent text anyway.
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: '#00000000', opacity: 0.01 }}
        />
      </View>
      <StepButton label={`+${AMOUNT_STEP}`} spoken={`More: +${AMOUNT_STEP} ml`} onPress={() => step(1)} />
    </View>
  );
}
