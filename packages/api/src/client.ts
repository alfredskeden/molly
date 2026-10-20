import { BabyBuddyError, errorKindFor } from './errors';
import type {
  Change,
  Child,
  Entry,
  EntryKind,
  EntryPatch,
  EntryQuery,
  Feeding,
  Measurement,
  MeasurementKind,
  Medication,
  NewMeasurement,
  Note,
  NoteQuery,
  NewChange,
  NewFeeding,
  NewMedication,
  NewNote,
  NewSleep,
  Page,
  Profile,
  Sleep,
  StopFeeding,
  StopSleep,
  Timer,
  NewTimer,
  TimerRef,
} from './types';

/**
 * `timeoutMs`: how long a request may take, answer included, before it fails as `unreachable`.
 * Without it, a connection the network silently dropped (a phone back from an hour in the pocket)
 * would hang for good.
 */
export type ClientConfig = { baseUrl: string; token: string; timeoutMs?: number };

const TIMEOUT_MS = 15_000;

/** `signal`: the caller's cancel (TanStack Query's). A cancelled request fails with the abort itself, never a `BabyBuddyError`. */
export type CallOptions = { signal?: AbortSignal };

type CollectOptions = CallOptions & { pageSize?: number };

type RequestOptions = CallOptions & {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number>;
  body?: unknown;
};

const ENTRY_PATHS: Record<EntryKind, string> = {
  sleep: 'sleep/',
  feeding: 'feedings/',
  change: 'changes/',
  medication: 'medication/',
};

const MEASUREMENT_PATHS: Record<MeasurementKind, string> = {
  weight: 'weight/',
  height: 'height/',
  head: 'head-circumference/',
  temperature: 'temperature/',
  bmi: 'bmi/',
};

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? Object.assign(new Error('Aborted'), { name: 'AbortError' });
}

export function createClient({ baseUrl, token, timeoutMs = TIMEOUT_MS }: ClientConfig) {
  async function request<T>(path: string, { signal, ...options }: RequestOptions = {}): Promise<T> {
    if (signal?.aborted) throw abortError(signal);
    // One controller for both the timeout and the caller's cancel: React Native's AbortSignal has no
    // `any` or `throwIfAborted`, and may have no `reason`.
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await send<T>(path, options, controller.signal);
    } catch (error) {
      if (signal?.aborted) throw abortError(signal);
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }

  async function send<T>(path: string, { method = 'GET', query, body }: RequestOptions, signal: AbortSignal): Promise<T> {
    const search = query
      ? `?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`
      : '';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/${path}${search}`, {
        method,
        headers: {
          Authorization: `Token ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (cause) {
      // Network failure, DNS, TLS, the timeout, or (in a browser) a CORS rejection: fetch can't tell them apart.
      throw new BabyBuddyError('unreachable', { cause });
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const kind = errorKindFor(response.status, body);
      throw new BabyBuddyError(kind, kind === 'validation' ? { fields: body } : undefined);
    }
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch (cause) {
      // A web page instead of the API: a wrong base URL, or a login page (Baby Buddy's, Cloudflare Access).
      throw new BabyBuddyError('unreachable', { cause });
    }
  }

  const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body });

  /**
   * Collects every page, newest first. Pages by offset rather than following `next`, whose
   * absolute URL can carry the wrong scheme behind a TLS-terminating proxy. An entry added between
   * pages shifts the next page by one, so its repeat is dropped by id.
   */
  async function collect<T extends { id: number }>(
    path: string,
    query: Record<string, string | number>,
    { pageSize = 100, signal }: CollectOptions = {},
  ): Promise<T[]> {
    const byId = new Map<number, T>();
    for (let offset = 0; ; ) {
      const page = await request<Page<T>>(path, { query: { ...query, limit: pageSize, offset }, signal });
      for (const item of page.results) if (!byId.has(item.id)) byId.set(item.id, item);
      offset += page.results.length;
      if (page.results.length === 0 || offset >= page.count) return [...byId.values()];
    }
  }

  // Explicit return types: consumers compiled without noUncheckedIndexedAccess would drop the null.
  const latest = async <K extends EntryKind>(kind: K, child: number, options?: CallOptions): Promise<Entry<K> | null> =>
    (await request<Page<Entry<K>>>(ENTRY_PATHS[kind], { query: { child, limit: 1 }, ...options })).results[0] ?? null;

  return {
    getProfile: (options?: CallOptions) => request<Profile>('profile', options),
    listChildren: async (options?: CallOptions) => (await request<Page<Child>>('children/', options)).results,

    findTimer: async (timer: TimerRef, options?: CallOptions): Promise<Timer | null> =>
      (await request<Page<Timer>>('timers/', { query: timer, ...options })).results[0] ?? null,
    /** Timers of every child the user may see, by name (`?name=` without `child`). */
    listTimers: (filter: { name: string }, options?: CallOptions) => collect<Timer>('timers/', filter, options),
    startTimer: (timer: NewTimer) => post<Timer>('timers/', timer),
    cancelTimer: (id: number) => request<void>(`timers/${id}/`, { method: 'DELETE' }),
    updateTimer: (id: number, changes: { start: string }) =>
      request<Timer>(`timers/${id}/`, { method: 'PATCH', body: changes }),
    stopSleep: (stop: StopSleep) => post<Sleep>(ENTRY_PATHS.sleep, stop),
    stopFeeding: (stop: StopFeeding) => post<Feeding>(ENTRY_PATHS.feeding, stop),

    logSleep: (sleep: NewSleep) => post<Sleep>(ENTRY_PATHS.sleep, sleep),
    logFeeding: (feeding: NewFeeding) => post<Feeding>(ENTRY_PATHS.feeding, feeding),
    logChange: (change: NewChange) => post<Change>(ENTRY_PATHS.change, change),
    logMedication: (medication: NewMedication) => post<Medication>(ENTRY_PATHS.medication, medication),
    getEntry: <K extends EntryKind>(kind: K, id: number, options?: CallOptions) =>
      request<Entry<K>>(`${ENTRY_PATHS[kind]}${id}/`, options),
    editEntry: <K extends EntryKind>(kind: K, id: number, changes: EntryPatch<K>) =>
      request<Entry<K>>(`${ENTRY_PATHS[kind]}${id}/`, { method: 'PATCH', body: changes }),
    deleteEntry: (kind: EntryKind, id: number) =>
      request<void>(`${ENTRY_PATHS[kind]}${id}/`, { method: 'DELETE' }),

    logMeasurement: <K extends MeasurementKind>(kind: K, measurement: NewMeasurement<K>) =>
      post<Measurement<K>>(MEASUREMENT_PATHS[kind], measurement),
    /**
     * Every entry of one measurement, newest first (by date, or time for temperature). Date-only
     * measurements have no `date_min` filter, and a child has few, so all of them.
     */
    listMeasurements: <K extends MeasurementKind>(kind: K, child: number, options?: CollectOptions) =>
      collect<Measurement<K>>(MEASUREMENT_PATHS[kind], { child }, options),

    createNote: (note: NewNote) => post<Note>('notes/', note),
    /** Tags replace the note's tags: Undo of a skip retags it, as parents can't delete notes. */
    updateNoteTags: (id: number, tags: string[]) => request<Note>(`notes/${id}/`, { method: 'PATCH', body: { tags } }),
    listNotes: (query: NoteQuery, options?: CallOptions) => collect<Note>('notes/', query, options),

    /** The newest entry of one kind, or null if there is none. */
    getLatestEntry: <K extends EntryKind>(kind: K, child: number, options?: CallOptions) => latest(kind, child, options),

    /**
     * The newest bottle feedings, newest first: one page, since the newest with an amount is
     * almost always among the first few.
     */
    getRecentBottles: async (child: number, options?: CallOptions): Promise<Feeding[]> =>
      (await request<Page<Feeding>>(ENTRY_PATHS.feeding, { query: { child, method: 'bottle', limit: 10 }, ...options }))
        .results,

    /** Default ordering is newest first (-start / -time), so `limit=1` is the latest. */
    getLatestEntries: async (child: number, options?: CallOptions) => {
      const [sleep, feeding, change] = await Promise.all([
        latest('sleep', child, options),
        latest('feeding', child, options),
        latest('change', child, options),
      ]);
      return { sleep, feeding, change };
    },

    /**
     * Collects every page, newest first. Pages by offset rather than following `next`, whose
     * absolute URL can carry the wrong scheme behind a TLS-terminating proxy.
     */
    listEntries: <K extends EntryKind>(kind: K, query: EntryQuery, options: CollectOptions = {}) =>
      collect<Entry<K>>(ENTRY_PATHS[kind], query, options),
  };
}

export type Client = ReturnType<typeof createClient>;
