import { BabyBuddyError, type Measurement, type MeasurementKind, type NewMeasurement } from '@molly/api';
import type { MeasurementLists } from '@molly/core';
import { useQueries, useQueryClient } from '@tanstack/react-query';

import { failureToast } from '@/features/dashboard/outcome-messages';
import { useClient, useKeyRejected } from '@/features/dashboard/queries';
import { useToast } from '@/features/toast/toast';
import { useHaptic } from '@/haptics/use-haptic';
import { isRefusalError } from '@/session/key-check';

import { guessMeasurement, MEASURES } from './model';

export const measurementsKey = (childId: number, kind: MeasurementKind) => ['measurements', childId, kind];

export type ChildMeasurements = {
  lists: MeasurementLists;
  /** Per measurement: still loading, refused by Baby Buddy (a caregiver can't see height, head or BMI), or failed. */
  status: Record<MeasurementKind, 'loading' | 'ready' | 'forbidden' | 'failed'>;
};

/** Every measurement of one child, a query each, so one Baby Buddy refuses doesn't hide the others. No polling. */
export function useMeasurements(childId: number): ChildMeasurements {
  const client = useClient();
  const results = useQueries({
    queries: MEASURES.map(({ kind }) => ({
      queryKey: measurementsKey(childId, kind),
      queryFn: ({ signal }: { signal: AbortSignal }) => client.listMeasurements(kind, childId, { signal }),
    })),
  });
  const lists: MeasurementLists = {};
  const status = {} as ChildMeasurements['status'];
  MEASURES.forEach(({ kind }, i) => {
    const result = results[i]!;
    if (result.data) (lists as Record<string, unknown>)[kind] = result.data;
    status[kind] = result.data
      ? 'ready'
      : result.error
        ? result.error instanceof BabyBuddyError && result.error.kind === 'forbidden'
          ? 'forbidden'
          : 'failed'
        : 'loading';
  });
  return { lists, status };
}

/**
 * Saves a measurement: shown at once (a guess with a negative id), undone if Baby Buddy refuses, refetched
 * either way. Resolves to whether it saved; a failure shows the normal error toast.
 */
export function useLogMeasurement(childId: number) {
  const client = useClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const haptic = useHaptic();
  const keyRejected = useKeyRejected();
  return async function save<K extends MeasurementKind>(kind: K, entry: NewMeasurement<K>): Promise<boolean> {
    const key = measurementsKey(childId, kind);
    await queryClient.cancelQueries({ queryKey: key });
    const before = queryClient.getQueryData<Measurement<K>[]>(key);
    queryClient.setQueryData<Measurement<K>[]>(key, (current) => [guessMeasurement(kind, entry, new Date()), ...(current ?? [])]);
    try {
      await client.logMeasurement(kind, entry);
      return true;
    } catch (error) {
      queryClient.setQueryData(key, before);
      if (!(error instanceof BabyBuddyError)) throw error;
      haptic('error');
      if (isRefusalError(error) && (await keyRejected())) return false;
      toast(
        error.kind === 'forbidden'
          ? { text: "Your Baby Buddy user can't add this. Nothing was saved.", tone: 'danger', help: 'permissions' }
          : failureToast(error.kind, error.fields ? Object.values(error.fields).flat().join(' ') : undefined),
      );
      return false;
    } finally {
      await queryClient.invalidateQueries({ queryKey: key });
    }
  };
}
