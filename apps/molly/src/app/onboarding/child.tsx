import { defaultChildPrefs, pickChildren } from '@molly/core';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Button, Screen, Text, Title } from '@/components/ui';
import { Avatar } from '@/features/children/Avatar';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { Glyph } from '@/theme/Glyph';

/** Several children in Baby Buddy: which Molly shows. All ticked; the unticked ones are saved hidden. */
export default function ChooseChildren() {
  const { pending, setPending } = useOnboarding();
  const haptic = useHaptic();
  const [ticked, setTicked] = useState<number[]>(() => pending?.children.map((child) => child.id) ?? []);
  if (!pending) return <Redirect href="/onboarding" />;
  const picked = pickChildren(pending.children, ticked);

  const toggle = (id: number) => {
    haptic(HAPTICS.choose);
    setTicked((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id]));
  };

  return (
    <Screen>
      <Title>Which children?</Title>
      <Text className="mb-5 text-base font-semibold text-muted">
        Molly shows one child at a time. Tap the name at the top to switch.
      </Text>
      <View className="mb-6 gap-2">
        {pending.children.map((child, index) => {
          const on = ticked.includes(child.id);
          return (
            <Pressable
              key={child.id}
              role="checkbox"
              aria-checked={on}
              accessibilityLabel={`${child.first_name} ${child.last_name}`.trim()}
              onPress={() => toggle(child.id)}
              className={`min-h-16 flex-row items-center gap-3 rounded-card border-card px-3 py-2 active:scale-[0.98] ${on ? 'border-edge bg-surface' : 'border-line bg-bg'}`}
            >
              <Avatar name={child.first_name} hue={defaultChildPrefs(index).hue} size={44} square faded={!on} />
              <Text className={`flex-1 text-lg font-extrabold ${on ? '' : 'text-muted'}`}>
                {`${child.first_name} ${child.last_name}`.trim()}
              </Text>
              <View
                aria-hidden
                className={`h-7 w-7 items-center justify-center rounded-chip border-2 ${on ? 'border-accent bg-accent' : 'border-line'}`}
              >
                {on && <Glyph name="check" size={18} color="on-accent" />}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Button
        label={
          picked.length === 0
            ? 'Pick at least one'
            : `Continue with ${picked.length} ${picked.length === 1 ? 'child' : 'children'}`
        }
        disabled={picked.length === 0}
        onPress={() => {
          setPending({ ...pending, picked });
          router.push('/onboarding/checklist');
        }}
      />
    </Screen>
  );
}
