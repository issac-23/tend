import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Habit, Entry } from '../db';
import { buildWeekSummary, buildClaudePrompt } from '../lib/ai';

const water: Habit = { id: 1, name: 'water', emoji: '💧', target: 8, unit: 'glasses', order: 0, createdAt: '' };
const bed:   Habit = { id: 2, name: 'make bed', emoji: '🛏️', target: 1, unit: '', order: 1, createdAt: '' };

const entry = (habitId: number, date: string, value: number, note?: string): Entry =>
  ({ id: Math.random(), habitId, date, value, note, createdAt: '' });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-13T12:00:00'));
});
afterEach(() => vi.useRealTimers());

describe('buildWeekSummary', () => {
  it('lists exact dates per habit for the last 7 days', () => {
    const entries = [
      entry(1, '2026-05-07', 8),
      entry(1, '2026-05-08', 8),
      entry(1, '2026-05-09', 3),
      entry(2, '2026-05-07', 1),
      entry(2, '2026-05-11', 1, 'tidy day'),
      entry(2, '2026-05-13', 1),
    ];
    const out = buildWeekSummary([water, bed], entries);

    expect(out).toContain('Week: 5/7/2026 – 5/13/2026');
    expect(out).toContain('💧 water: 2/7 days');
    expect(out).toContain('completed: Thu 5/7, Fri 5/8');
    expect(out).toContain('🛏️ make bed: 3/7 days');
    expect(out).toContain('note (Mon 5/11): tidy day');
  });

  it('omits "missed" line when nothing was missed', () => {
    const days = ['2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12','2026-05-13'];
    const entries = days.map((d) => entry(2, d, 1));
    const out = buildWeekSummary([bed], entries);
    expect(out).toContain('7/7 days');
    expect(out).not.toContain('missed:');
  });

  it('omits "completed" line when nothing was completed', () => {
    const out = buildWeekSummary([bed], []);
    expect(out).toContain('0/7 days');
    expect(out).not.toContain('completed:');
    expect(out).not.toContain('missed:');
  });
});

describe('buildClaudePrompt', () => {
  it('frames the prompt with the summary embedded', () => {
    const summary = 'Week: x – y\n- 🛏️ make bed: 7/7 days';
    const p = buildClaudePrompt(summary);
    expect(p).toContain('honest read');
    expect(p).toContain('ONE focused change');
    expect(p).toContain(summary);
  });
});
