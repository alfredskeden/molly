import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient, QueryClientProvider, type Query } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { tapLog } from '@/tap-log/log';

import { freshConnections } from './connections';
import { listenForReconnect } from './online';
import { shouldPersist, shouldRetry } from './query-rules';

const CACHE_KEY = 'molly.query-cache';
/** Bump when the shape of a persisted query changes, so an old cache is dropped instead of misread. */
const CACHE_VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

listenForReconnect();

/**
 * A client whose cache knows which queries hold a guess: data last set by hand (`setQueryData`, a tap's
 * guess or its undo) rather than fetched, until the next fetch answers.
 */
function createQueryClient() {
  const client = new QueryClient({
    // `always`: offline reads fail (the dashboard says "can't reach") instead of pausing silently.
    // Reconnecting still refetches them.
    defaultOptions: { queries: { retry: shouldRetry, gcTime: DAY_MS, networkMode: 'always' } },
  });
  const guessed = new Set<string>();
  client.getQueryCache().subscribe((event) => {
    if (event.type === 'removed') guessed.delete(event.query.queryHash);
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    if (event.action.manual) guessed.add(event.query.queryHash);
    else guessed.delete(event.query.queryHash);
  });
  const persist = (query: Query) =>
    shouldPersist({ key: query.queryKey, status: query.state.status, guessed: guessed.has(query.queryHash) });
  return { client, persist };
}

/**
 * `persistKey` names the signed-in session; a different one drops the stored cache. Without one
 * (signed out) nothing is persisted and the stored cache is removed.
 */
export function QueryProvider({ persistKey, children }: { persistKey: string | null; children: ReactNode }) {
  const [{ client, persist }] = useState(createQueryClient);
  const [storage] = useState(closableStorage);
  const [persister] = useState(() => createAsyncStoragePersister({ storage, key: CACHE_KEY }));

  useEffect(() => {
    // The browser's visibility events already drive focus on web.
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (status) => {
      // Before the refetch that coming back starts, so it goes out on a new connection.
      if (status === 'active') {
        // Logged on both sides: a native call that never returns would block the JS thread.
        tapLog('fresh connections');
        const started = Date.now();
        freshConnections();
        tapLog(`fresh connections done in ${Date.now() - started} ms`);
      }
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Settings are only refetched when saved: a new session starts from what sign-in stored.
    client.removeQueries({ queryKey: ['settings'] });
  }, [client, persistKey]);

  useEffect(() => {
    storage.open();
    if (persistKey === null) AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
    return storage.close;
  }, [persistKey, storage]);

  if (persistKey === null) return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: DAY_MS,
        buster: `${CACHE_VERSION}|${persistKey}`,
        dehydrateOptions: { shouldDehydrateQuery: persist },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/**
 * Writes are throttled, so one can land after sign-out has removed the cache. Closing the storage
 * when its provider goes away drops those late writes.
 */
function closableStorage() {
  let isOpen = true;
  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: async (key: string, value: string) => {
      if (isOpen) await AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => AsyncStorage.removeItem(key),
    open: () => {
      isOpen = true;
    },
    close: () => {
      isOpen = false;
    },
  };
}
