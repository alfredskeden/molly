import type { ComponentProps } from 'react';
import { Pressable as NativePressable } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { tapLog } from '@/tap-log/log';

const PRESS_SCALE = /(^|\s)active:scale-\[[\d.]+\]/g;

/**
 * React Native's Pressable, without the press scale (`active:scale-[…]`) when the system asks for less
 * motion (Android's Remove animations). Presses go into the Tap log, named by `logName` (a button's label)
 * or its accessibility label.
 */
export function Pressable({
  className,
  onPressIn,
  onPress,
  logName,
  ...props
}: ComponentProps<typeof NativePressable> & { className?: string; logName?: string }) {
  const reduceMotion = useReducedMotion();
  const name = logName ?? props.accessibilityLabel ?? props.testID ?? 'unnamed';
  return (
    <NativePressable
      className={reduceMotion ? className?.replace(PRESS_SCALE, '') : className}
      {...props}
      onPressIn={(event) => {
        tapLog(`press in ${name}`);
        onPressIn?.(event);
      }}
      onPress={
        onPress &&
        ((event) => {
          tapLog(`press ${name}`);
          onPress(event);
        })
      }
    />
  );
}
