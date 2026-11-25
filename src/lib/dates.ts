import { format, startOfWeek, addDays, subDays, parseISO, differenceInCalendarDays } from 'date-fns';

export const todayKey = () => format(new Date(), 'yyyy-MM-dd');
export const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');
export const parseKey = (s: string) => parseISO(s);

export function weekStart(d: Date = new Date()) {
  return startOfWeek(d, { weekStartsOn: 1 }); // Mon
}

export function lastNDays(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dateKey(subDays(end, i)));
  return out;
}

export function yearGridDays(end: Date = new Date()): string[] {
  // 53 weeks * 7 days = 371 cells, ending today, aligned to weeks (Sun-Sat columns)
  const days: string[] = [];
  const dayOfWeek = end.getDay(); // 0=Sun
  const lastSat = addDays(end, 6 - dayOfWeek);
  for (let i = 53 * 7 - 1; i >= 0; i--) {
    days.push(dateKey(subDays(lastSat, i)));
  }
  return days;
}

// Grid from Jan 1 of `end`'s year (aligned back to the prior Sunday) through
// the upcoming Saturday. Result length is always a multiple of 7.
export function yearToDateGridDays(end: Date = new Date()): string[] {
  const dayOfWeek = end.getDay();
  const lastSat = addDays(end, 6 - dayOfWeek);
  const jan1 = new Date(end.getFullYear(), 0, 1);
  const jan1Dow = jan1.getDay(); // 0=Sun
  const start = subDays(jan1, jan1Dow); // back up to the Sunday on or before Jan 1
  const days: string[] = [];
  let cursor = start;
  while (dateKey(cursor) <= dateKey(lastSat)) {
    days.push(dateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function daysBetween(a: string, b: string) {
  return Math.abs(differenceInCalendarDays(parseISO(a), parseISO(b)));
}

export function isToday(s: string) {
  return s === todayKey();
}

export function isSunday(d: Date = new Date()) {
  return d.getDay() === 0;
}

export function prettyDate(s: string) {
  return format(parseISO(s), 'EEE, MMM d');
}
