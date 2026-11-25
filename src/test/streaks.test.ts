import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Habit, Entry } from '../db';
import { currentStreak, longestStreak, isMet } from '../lib/streaks';

const habit: Habit = {
  id: 1,
  name: 'read',
  emoji: '📚',
  target: 1,
  unit: '',
  order: 0,
  createdAt: '2026-01-01T00:00:00Z',
};

const entry = (date: string, value: number): Entry => ({
  id: Math.floor(Math.random() * 1e9),
  habitId: 1,
  date,
  value,
  createdAt: '2026-01-01T00:00:00Z',
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-13T08:00:00')); // Wed May 13, local-naive
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isMet', () => {
  it('false for undefined', () => {
    expect(isMet(undefined, habit)).toBe(false);
  });
  it('false below target', () => {
    expect(isMet(entry('2026-05-13', 0), habit)).toBe(false);
  });
  it('true at target', () => {
    expect(isMet(entry('2026-05-13', 1), habit)).toBe(true);
  });
  it('true above target', () => {
    expect(isMet(entry('2026-05-13', 5), { ...habit, target: 3 })).toBe(true);
  });
});

describe('currentStreak', () => {
  it('0 when no entries', () => {
    expect(currentStreak(habit, [])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const entries = [
      entry('2026-05-11', 1),
      entry('2026-05-12', 1),
      entry('2026-05-13', 1),
    ];
    expect(currentStreak(habit, entries)).toBe(3);
  });

  it("doesn't drop just because today isn't met yet", () => {
    const entries = [
      entry('2026-05-11', 1),
      entry('2026-05-12', 1),
      // no entry for today (May 13)
    ];
    expect(currentStreak(habit, entries)).toBe(2);
  });

  it('breaks on a missed day', () => {
    const entries = [
      entry('2026-05-10', 1),
      // skip 11
      entry('2026-05-12', 1),
      entry('2026-05-13', 1),
    ];
    expect(currentStreak(habit, entries)).toBe(2);
  });

  it('ignores entries below target', () => {
    const entries = [
      entry('2026-05-12', 1),
      entry('2026-05-13', 0),
    ];
    expect(currentStreak(habit, entries)).toBe(1);
  });
});

describe('longestStreak', () => {
  it('0 with no met entries', () => {
    expect(longestStreak(habit, [])).toBe(0);
  });

  it('finds the longest run', () => {
    const entries = [
      entry('2026-01-01', 1),
      entry('2026-01-02', 1),
      entry('2026-01-03', 1),
      // gap
      entry('2026-01-10', 1),
      entry('2026-01-11', 1),
    ];
    expect(longestStreak(habit, entries)).toBe(3);
  });
});
