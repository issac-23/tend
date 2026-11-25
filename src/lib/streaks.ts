import type { Entry, Habit } from '../db';
import { dateKey, todayKey } from './dates';
import { subDays, parseISO } from 'date-fns';

export function entriesByDate(entries: Entry[]): Map<string, Entry> {
  const m = new Map<string, Entry>();
  for (const e of entries) m.set(e.date, e);
  return m;
}

export function isMet(entry: Entry | undefined, habit: Habit) {
  if (!entry) return false;
  return entry.value >= habit.target;
}

// Current streak counting back from today (or yesterday if today not yet met)
export function currentStreak(habit: Habit, entries: Entry[]): number {
  const map = entriesByDate(entries);
  let streak = 0;
  const today = new Date();
  // If today not met, start from yesterday so streak doesn't drop mid-day
  let cursor = today;
  if (!isMet(map.get(dateKey(today)), habit)) {
    cursor = subDays(today, 1);
  }
  while (true) {
    const key = dateKey(cursor);
    if (isMet(map.get(key), habit)) {
      streak++;
      cursor = subDays(cursor, 1);
    } else break;
  }
  return streak;
}

export function longestStreak(habit: Habit, entries: Entry[]): number {
  const sorted = [...entries]
    .filter((e) => isMet(e, habit))
    .sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const e of sorted) {
    if (prev) {
      const diff = (parseISO(e.date).getTime() - parseISO(prev).getTime()) / 86400000;
      if (diff === 1) cur++;
      else cur = 1;
    } else cur = 1;
    longest = Math.max(longest, cur);
    prev = e.date;
  }
  return longest;
}

export function todaysEntry(habit: Habit, entries: Entry[]): Entry | undefined {
  const t = todayKey();
  return entries.find((e) => e.habitId === habit.id && e.date === t);
}
