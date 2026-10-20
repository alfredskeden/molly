import type { ChildStatus } from '@molly/core';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/ui';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { PLAIN, spoken } from '@/theme/copy';
import { useCopy } from '@/theme/theme';

import { Avatar } from './Avatar';

export type SheetChild = { id: number; name: string; hue: number; status: ChildStatus | null };

/**
 * The Children sheet, opened from the avatar stack: a row per shown child with how it's doing, then the
 * way to Settings. A row switches and closes; the current child's row only closes.
 */
export function ChildrenSheet({
  rows,
  currentId,
  onPick,
  onSettings,
  onClose,
}: {
  rows: SheetChild[];
  currentId: number;
  onPick: (childId: number) => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  const copy = useCopy();
  const haptic = useHaptic();
  return (
    <Sheet label="Children" onScrimPress={onClose}>
      <Text accessibilityRole="header" className="text-xl font-display tracking-display-0_5">
        Children
      </Text>
      <View className="gap-1">
        {rows.map((child) => {
          const current = child.id === currentId;
          return (
            <Pressable
              key={child.id}
              accessibilityRole="button"
              accessibilityLabel={[child.name, child.status?.label, current && 'Showing'].filter(Boolean).join(', ')}
              aria-selected={current}
              onPress={() => {
                if (!current) {
                  haptic(HAPTICS.choose);
                  onPick(child.id);
                }
                onClose();
              }}
              className={`min-h-16 flex-row items-center gap-3 rounded-card px-2 py-2 active:scale-[0.98] ${current ? 'bg-bg' : ''}`}
            >
              <Avatar name={child.name} hue={child.hue} size={48} />
              <View className="flex-1">
                <Text className="text-lg font-extrabold">{child.name}</Text>
                {child.status && (
                  <Text className={`text-sm font-bold ${child.status.sleeping ? 'text-sleep-ink' : 'text-muted'}`}>
                    {child.status.label}
                  </Text>
                )}
              </View>
              {current && <Text className="text-sm font-extrabold text-muted">Showing</Text>}
            </Pressable>
          );
        })}
      </View>
      <View className="h-px bg-line" />
      <View>
        <SheetLink label="Manage children" onPress={onSettings} />
        <SheetLink label={copy.settings} spokenLabel={spoken(copy.settings, PLAIN.settings)} onPress={onSettings} />
      </View>
    </Sheet>
  );
}

function SheetLink({ label, spokenLabel, onPress }: { label: string; spokenLabel?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={spokenLabel ?? label}
      onPress={onPress}
      className="min-h-12 flex-row items-center justify-between px-2 active:scale-[0.98]"
    >
      <Text className="text-base font-extrabold">{label}</Text>
      <Text aria-hidden className="text-lg font-extrabold text-muted">
        ›
      </Text>
    </Pressable>
  );
}
