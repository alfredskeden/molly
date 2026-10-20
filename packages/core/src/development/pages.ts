import { counted } from '../format';
import { daysBetween, localDate } from '../measurements';
import { ageInMonths } from '../sleep-guide';

/** A guide page by the age in months it starts at; 0 is Newborn. */
export type GuidePage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 15 | 18 | 21 | 24 | 30 | 36;

/** Monthly in the first year, then every 3 months, then every 6, to 3 years. */
export const GUIDE_PAGES: readonly GuidePage[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 30, 36];

const LAST_PAGE = 36;

/** The last page the child has reached, or none once they are past 36 months (the guide ends at 3). */
export function guidePage(birthDate: string, now: Date): GuidePage | null {
  const months = ageInMonths(birthDate, now);
  if (months > LAST_PAGE) return null;
  return GUIDE_PAGES.filter((page) => page <= months).at(-1) ?? 0;
}

export function pageNeighbours(page: GuidePage): { previous: GuidePage | null; next: GuidePage | null } {
  const index = GUIDE_PAGES.indexOf(page);
  return { previous: GUIDE_PAGES[index - 1] ?? null, next: GUIDE_PAGES[index + 1] ?? null };
}

/** Where a page stands for the child in All ages; every page is past once the guide has ended (`null`). */
export type PageTag = 'past' | 'now' | 'next' | 'later';

export function pageTags(childPage: GuidePage | null): { page: GuidePage; tag: PageTag }[] {
  const now = childPage === null ? GUIDE_PAGES.length : GUIDE_PAGES.indexOf(childPage);
  return GUIDE_PAGES.map((page, index) => ({
    page,
    tag: index < now ? 'past' : index === now ? 'now' : index === now + 1 ? 'next' : 'later',
  }));
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Where the child stands on a page, to follow their name: `is 5 months, 3 weeks` on their own page,
 * `reaches this in 2 months` ahead of it, `was here in March` past it.
 */
export function pageStanding(page: GuidePage, birthDate: string, now: Date): string {
  const birth = localDate(birthDate);
  if (page === guidePage(birthDate, now)) return ageWords(birth, ageInMonths(birthDate, now), now);
  const reached = addMonths(birth, page);
  if (reached > now) return `reaches this ${untilWords(reached, now)}`;
  const year = reached.getFullYear() === now.getFullYear() ? '' : ` ${reached.getFullYear()}`;
  return `was here in ${MONTH_NAMES[reached.getMonth()]}${year}`;
}

/** `was born today`, `is 5 days old`, `is 3 weeks old` under a month, then `is 5 months, 3 weeks`. */
function ageWords(birth: Date, months: number, now: Date): string {
  const days = daysBetween(addMonths(birth, months), now);
  const weeks = Math.floor(days / 7);
  if (months === 0) {
    if (days === 0) return 'was born today';
    return `is ${weeks > 0 ? counted(weeks, 'week') : counted(days, 'day')} old`;
  }
  return `is ${counted(months, 'month')}${weeks > 0 ? `, ${counted(weeks, 'week')}` : ''}`;
}

/** `tomorrow`, `in 5 days`, `in 3 weeks` under a month, then `in 2 months` to the nearest month. */
function untilWords(reached: Date, now: Date): string {
  let months = 0;
  while (addMonths(now, months + 1) <= reached) months++;
  const days = daysBetween(addMonths(now, months), reached);
  if (months > 0) return `in ${counted(days >= 15 ? months + 1 : months, 'month')}`;
  if (days === 1) return 'tomorrow';
  return `in ${days >= 7 ? counted(Math.floor(days / 7), 'week') : counted(days, 'day')}`;
}

/** The same day some months on, or the month's last day when it's shorter (31 Jan + 1 month is 28 Feb). */
function addMonths(date: Date, months: number): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), lastDay), date.getHours(), date.getMinutes());
}

/** `5 months` on the page, `Month 5` on the child screen's card, `5m` in the month strip; Newborn is `New` there. */
export function pageTitles(page: GuidePage): { title: string; card: string; short: string } {
  if (page === 0) return { title: 'Newborn', card: 'Newborn', short: 'New' };
  return { title: counted(page, 'month'), card: `Month ${page}`, short: `${page}m` };
}
