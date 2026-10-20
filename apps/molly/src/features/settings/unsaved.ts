import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useToast } from '@/features/toast/toast';

/** Leaving a screen with unsaved changes drops them, and says so (Settings and the child screen). */
export function useUnsavedToast(dirty: boolean, text: string) {
  const navigation = useNavigation();
  const toast = useToast();
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (dirtyRef.current) toast({ text, tone: 'danger' });
      }),
    [navigation, toast, text],
  );
}
