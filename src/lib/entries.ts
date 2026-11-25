import type { Dexie, Table } from 'dexie';
import type { Entry, Habit, Tap } from '../db';

type EntryTable = Table<Entry, number>;
type TapTable = Table<Tap, number>;

type DB = Dexie & { entries: EntryTable; taps: TapTable };

type AdjustOptions = {
  cap?: boolean; // cap at habit.target (default true)
  clock?: () => Date; // for tests
};

// Increment/decrement today's value for a habit in a single transaction so rapid
// taps don't race on a stale snapshot. Also appends a row to the `taps` table
// so the today log can show a true tap-by-tap timeline. Returns the resulting
// value (or null if cleared).
export async function adjustEntry(
  db: DB,
  habit: Habit,
  date: string,
  delta: number,
  opts: AdjustOptions = {},
): Promise<number | null> {
  const cap = opts.cap ?? true;
  const clock = opts.clock ?? (() => new Date());

  return db.transaction('rw', db.entries, db.taps, async () => {
    const existing = await db.entries.where({ habitId: habit.id!, date }).first();
    const current = existing?.value ?? 0;
    let next = current + delta;
    if (cap) next = Math.min(next, habit.target);
    next = Math.max(0, next);
    const actualDelta = next - current;
    const now = clock().toISOString();

    if (actualDelta !== 0) {
      await db.taps.add({
        habitId: habit.id!,
        date,
        delta: actualDelta,
        value: next,
        ts: now,
      });
    }

    if (existing) {
      if (next === 0 && !existing.note) {
        await db.entries.delete(existing.id!);
        return null;
      }
      await db.entries.update(existing.id!, { value: next, updatedAt: now });
      return next;
    }
    if (next > 0) {
      await db.entries.add({
        habitId: habit.id!,
        date,
        value: next,
        createdAt: now,
        updatedAt: now,
      });
      return next;
    }
    return null;
  });
}

// Re-apply a previously undone tap. Used by the "Undone — tap to restore"
// toast. Adds delta back to the entry (creating one if needed) and re-inserts
// the original tap row so the timeline matches what it was before the undo.
export async function restoreTap(db: DB, tap: Tap, clock: () => Date = () => new Date()) {
  return db.transaction('rw', db.entries, db.taps, async () => {
    const existing = await db.entries.where({ habitId: tap.habitId, date: tap.date }).first();
    const current = existing?.value ?? 0;
    const next = Math.max(0, current + tap.delta);
    const now = clock().toISOString();

    await db.taps.add({
      habitId: tap.habitId,
      date: tap.date,
      delta: tap.delta,
      value: next,
      ts: tap.ts, // preserve the original time so the row appears in the same place
    });

    if (existing) {
      if (next === 0 && !existing.note) {
        await db.entries.delete(existing.id!);
      } else {
        await db.entries.update(existing.id!, { value: next, updatedAt: now });
      }
    } else if (next > 0) {
      await db.entries.add({
        habitId: tap.habitId,
        date: tap.date,
        value: next,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

// Reverse a single tap: delete it and undo its delta on the daily entry.
// If the entry hits zero with no note it's removed; if the entry doesn't
// exist anymore (because a downstream tap cleared it) we may need to
// re-create it.
export async function undoTap(db: DB, tapId: number, clock: () => Date = () => new Date()) {
  return db.transaction('rw', db.entries, db.taps, async () => {
    const tap = await db.taps.get(tapId);
    if (!tap) return;

    const entry = await db.entries.where({ habitId: tap.habitId, date: tap.date }).first();
    const currentValue = entry?.value ?? 0;
    const reversed = Math.max(0, currentValue - tap.delta);
    const now = clock().toISOString();

    await db.taps.delete(tapId);

    if (entry) {
      if (reversed === 0 && !entry.note) {
        await db.entries.delete(entry.id!);
      } else {
        await db.entries.update(entry.id!, { value: reversed, updatedAt: now });
      }
    } else if (reversed > 0) {
      await db.entries.add({
        habitId: tap.habitId,
        date: tap.date,
        value: reversed,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}
