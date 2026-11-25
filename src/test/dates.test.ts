import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { parseISO } from 'date-fns';
import { todayKey, lastNDays, yearGridDays, isSunday, isToday } from '../lib/dates';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-13T08:00:00')); // Wed
});
afterEach(() => vi.useRealTimers());

describe('todayKey', () => {
  it('returns yyyy-MM-dd for local now', () => {
    expect(todayKey()).toBe('2026-05-13');
  });
});

describe('lastNDays', () => {
  it('returns N dates ending today, oldest first', () => {
    const days = lastNDays(7);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe('2026-05-13');
    expect(days[0]).toBe('2026-05-07');
  });
});

describe('yearGridDays', () => {
  it('returns exactly 53 weeks worth of days (371)', () => {
    const days = yearGridDays();
    expect(days).toHaveLength(53 * 7);
  });

  it('ends on a Saturday >= today', () => {
    const days = yearGridDays();
    const last = parseISO(days[days.length - 1]); // local-tz parse
    expect(last.getDay()).toBe(6); // Sat
  });

  it('includes today', () => {
    expect(yearGridDays().includes('2026-05-13')).toBe(true);
  });
});

describe('isSunday', () => {
  it('false for Wed', () => {
    expect(isSunday()).toBe(false);
  });
  it('true for an explicit Sunday', () => {
    expect(isSunday(new Date('2026-05-10T12:00:00'))).toBe(true);
  });
});

describe('isToday', () => {
  it('true for today', () => {
    expect(isToday('2026-05-13')).toBe(true);
  });
  it('false for yesterday', () => {
    expect(isToday('2026-05-12')).toBe(false);
  });
});
