import { describe, it, expect, beforeEach } from 'vitest';
import Dexie, { type Table } from 'dexie';
import type { Habit, Entry, Tap } from '../db';
import { adjustEntry, undoTap, restoreTap } from '../lib/entries';

// A fresh in-memory db per test, mirroring schema v3.
class TestDB extends Dexie {
  habits!: Table<Habit, number>;
  entries!: Table<Entry, number>;
  taps!: Table<Tap, number>;
  constructor(name: string) {
    super(name);
    this.version(3).stores({
      habits: '++id, order, archivedAt',
      entries: '++id, habitId, date, [habitId+date]',
      taps: '++id, habitId, date, ts, [habitId+date]',
    });
  }
}

let db: TestDB;
let habit: Habit;

const date = '2026-05-13';
const clock = () => new Date('2026-05-13T12:00:00Z');

beforeEach(async () => {
  db = new TestDB(`test-${Math.random()}`);
  const id = await db.habits.add({
    name: 'water',
    emoji: '💧',
    target: 8,
    unit: 'glasses',
    order: 0,
    createdAt: clock().toISOString(),
  });
  habit = (await db.habits.get(id))!;
});

describe('adjustEntry', () => {
  it('creates an entry on first increment', async () => {
    const next = await adjustEntry(db, habit, date, +1, { clock });
    expect(next).toBe(1);
    const all = await db.entries.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ habitId: habit.id, date, value: 1 });
  });

  it('decrements without going below 0', async () => {
    const next = await adjustEntry(db, habit, date, -1, { clock });
    expect(next).toBeNull();
    expect(await db.entries.count()).toBe(0);
  });

  it('caps at target by default', async () => {
    for (let i = 0; i < 12; i++) await adjustEntry(db, habit, date, +1, { clock });
    const e = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(e?.value).toBe(8);
  });

  it('regression: 8 → 7 → ... → 1 → 0 decrements one at a time, never resets', async () => {
    for (let i = 0; i < 8; i++) await adjustEntry(db, habit, date, +1, { clock });
    const seen: (number | null)[] = [];
    for (let i = 0; i < 9; i++) {
      seen.push(await adjustEntry(db, habit, date, -1, { clock }));
    }
    expect(seen).toEqual([7, 6, 5, 4, 3, 2, 1, null, null]);
    expect(await db.entries.count()).toBe(0);
  });

  it('clears the entry when value reaches 0 and there is no note', async () => {
    await adjustEntry(db, habit, date, +1, { clock });
    const after = await adjustEntry(db, habit, date, -1, { clock });
    expect(after).toBeNull();
    expect(await db.entries.count()).toBe(0);
  });

  it('keeps the entry at value=0 if there is a note', async () => {
    const id = await db.entries.add({
      habitId: habit.id!,
      date,
      value: 1,
      note: 'felt sick',
      createdAt: clock().toISOString(),
    });
    const after = await adjustEntry(db, habit, date, -1, { clock });
    expect(after).toBe(0);
    const e = await db.entries.get(id);
    expect(e?.note).toBe('felt sick');
    expect(e?.value).toBe(0);
  });

  it('does not create duplicate entries on rapid concurrent increments', async () => {
    await Promise.all([
      adjustEntry(db, habit, date, +1, { clock }),
      adjustEntry(db, habit, date, +1, { clock }),
      adjustEntry(db, habit, date, +1, { clock }),
    ]);
    const all = await db.entries.where({ habitId: habit.id!, date }).toArray();
    expect(all).toHaveLength(1);
    expect(all[0].value).toBe(3);
  });

  it('uncapped mode lets value exceed target', async () => {
    for (let i = 0; i < 10; i++) await adjustEntry(db, habit, date, +1, { cap: false, clock });
    const e = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(e?.value).toBe(10);
  });

  it('stamps updatedAt on every write so the today log reflects last-touched time', async () => {
    let t = new Date('2026-05-13T09:00:00Z');
    const tickClock = () => t;
    await adjustEntry(db, habit, date, +1, { clock: tickClock });
    const first = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(first?.updatedAt).toBe('2026-05-13T09:00:00.000Z');
    expect(first?.createdAt).toBe('2026-05-13T09:00:00.000Z');

    t = new Date('2026-05-13T14:30:00Z');
    await adjustEntry(db, habit, date, +1, { clock: tickClock });
    const second = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(second?.updatedAt).toBe('2026-05-13T14:30:00.000Z');
    expect(second?.createdAt).toBe('2026-05-13T09:00:00.000Z');
  });
});

describe('adjustEntry - tap timeline', () => {
  it('writes one tap per successful adjust with the correct delta and resulting value', async () => {
    let t = new Date('2026-05-13T09:00:00Z');
    const tickClock = () => t;
    await adjustEntry(db, habit, date, +1, { clock: tickClock });
    t = new Date('2026-05-13T09:05:00Z');
    await adjustEntry(db, habit, date, +1, { clock: tickClock });
    t = new Date('2026-05-13T15:00:00Z');
    await adjustEntry(db, habit, date, -1, { clock: tickClock });

    const taps = await db.taps.where({ habitId: habit.id!, date }).toArray();
    expect(taps).toHaveLength(3);
    expect(taps.map((x) => ({ delta: x.delta, value: x.value }))).toEqual([
      { delta: 1, value: 1 },
      { delta: 1, value: 2 },
      { delta: -1, value: 1 },
    ]);
  });

  it('does not write a tap when delta is clamped to 0 (e.g. + at target, - at zero)', async () => {
    for (let i = 0; i < 8; i++) await adjustEntry(db, habit, date, +1, { clock });
    const tapsBefore = await db.taps.count();
    // already at target, +1 should be a no-op
    await adjustEntry(db, habit, date, +1, { clock });
    const tapsAfter = await db.taps.count();
    expect(tapsAfter).toBe(tapsBefore);
  });

  it('does not write a tap when - at zero is a no-op', async () => {
    const before = await db.taps.count();
    await adjustEntry(db, habit, date, -1, { clock });
    const after = await db.taps.count();
    expect(after).toBe(before);
  });
});

describe('undoTap', () => {
  it('reverses a +1 by subtracting from the entry value', async () => {
    await adjustEntry(db, habit, date, +1, { clock }); // value 1
    await adjustEntry(db, habit, date, +1, { clock }); // value 2
    const taps = await db.taps.where({ habitId: habit.id!, date }).toArray();
    expect(taps).toHaveLength(2);

    await undoTap(db, taps[1].id!, clock);
    const e = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(e?.value).toBe(1);
    expect(await db.taps.count()).toBe(1);
  });

  it('removes the entry when reversing the last +1 brings value to 0', async () => {
    await adjustEntry(db, habit, date, +1, { clock });
    const taps = await db.taps.toArray();
    await undoTap(db, taps[0].id!, clock);
    expect(await db.entries.count()).toBe(0);
    expect(await db.taps.count()).toBe(0);
  });

  it('reversing a -1 brings the value back up', async () => {
    await adjustEntry(db, habit, date, +1, { clock });
    await adjustEntry(db, habit, date, +1, { clock }); // value 2
    await adjustEntry(db, habit, date, -1, { clock }); // value 1
    const taps = await db.taps.where({ habitId: habit.id!, date }).sortBy('ts');
    // undo the -1
    const minus = taps.find((t) => t.delta === -1)!;
    await undoTap(db, minus.id!, clock);
    const e = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(e?.value).toBe(2);
  });

  it('recreates the entry if undoing a tap that previously cleared it', async () => {
    await adjustEntry(db, habit, date, +1, { clock }); // value 1, entry exists
    await adjustEntry(db, habit, date, -1, { clock }); // value 0, entry deleted
    expect(await db.entries.count()).toBe(0);

    const minus = (await db.taps.toArray()).find((t) => t.delta === -1)!;
    await undoTap(db, minus.id!, clock);
    const e = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(e?.value).toBe(1);
  });

  it('restoreTap reapplies the delta and re-inserts the tap row', async () => {
    await adjustEntry(db, habit, date, +1, { clock });
    const tap = (await db.taps.toArray())[0];
    await undoTap(db, tap.id!, clock);
    expect(await db.entries.count()).toBe(0);
    expect(await db.taps.count()).toBe(0);

    await restoreTap(db, tap, clock);
    const e = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(e?.value).toBe(1);
    const restored = await db.taps.toArray();
    expect(restored).toHaveLength(1);
    expect(restored[0].delta).toBe(1);
    expect(restored[0].ts).toBe(tap.ts);
  });

  it('preserves a note when value is brought back to 0 via undo', async () => {
    // Manually seed an entry with a note + a tap that took it to 0
    await db.entries.add({
      habitId: habit.id!,
      date,
      value: 0,
      note: 'felt sick',
      createdAt: clock().toISOString(),
      updatedAt: clock().toISOString(),
    });
    const tapId = await db.taps.add({
      habitId: habit.id!,
      date,
      delta: -1,
      value: 0,
      ts: clock().toISOString(),
    });
    await undoTap(db, tapId, clock);
    const e = await db.entries.where({ habitId: habit.id!, date }).first();
    expect(e?.value).toBe(1);
    expect(e?.note).toBe('felt sick');
  });
});
