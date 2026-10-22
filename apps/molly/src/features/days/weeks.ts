import type { EntriesByKind } from '@molly/core';

/** Recent days fetch a week at a time. */
export const WINDOW_DAYS = 7;

/** Week 0 runs up to tonight's midnight; week n is n weeks before it. */
export function weekWindow(week: number, now: Date): { from: Date; to: Date } {
  const end = (weeksBack: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 - WINDOW_DAYS * weeksBack);
  return { from: end(week + 1), to: end(week) };
}

/** Every loaded week's entries as one set, without the repeats where weeks overlap. */
export function mergeWeeks(pages: { entries: EntriesByKind }[]): EntriesByKind {
  const unique = <T extends { id: number }>(lists: T[][]) => [...new Map(lists.flat().map((entry) => [entry.id, entry])).values()];
  return {
    sleep: unique(pages.map((page) => page.entries.sleep)),
    feeding: unique(pages.map((page) => page.entries.feeding)),
    change: unique(pages.map((page) => page.entries.change)),
    medication: unique(pages.map((page) => page.entries.medication)),
  };
}

/** Another week is worth asking for while the oldest one Baby Buddy sent had anything in it. */
export function olderMayExist(pages: { entries: EntriesByKind }[] | undefined): boolean {
  const oldest = pages?.at(-1)?.entries;
  return !!oldest && Object.values(oldest).some((list) => list.length > 0);
}
