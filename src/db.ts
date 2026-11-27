import Dexie, { type Table } from 'dexie';

export type Habit = {
  id?: number;
  name: string;
  emoji: string;
  target: number;
  unit: string;
  order: number;
  createdAt: string;
  archivedAt?: string;
  onDeckAt?: string; // parked: kept around with its history but not actively tracked
};

export const isActive = (h: Habit) => !h.archivedAt && !h.onDeckAt;
export const isOnDeck = (h: Habit) => !h.archivedAt && !!h.onDeckAt;

export type Entry = {
  id?: number;
  habitId: number;
  date: string;
  value: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

// One row per user interaction (tap +/-, manual save). Powers the today log
// timeline. Distinct from `entries` which holds the daily aggregate.
export type Tap = {
  id?: number;
  habitId: number;
  date: string;
  delta: number;    // change applied (+1, -1, or net delta from a manual save)
  value: number;    // resulting value after this tap
  ts: string;       // ISO instant
};

export const TASK_CATEGORIES = ['school', 'emails', 'work', 'life'] as const;
export const TASK_STATUSES = ['todo', 'pending', 'completed', 'cancelled'] as const;

// Shared shape with the drift desktop app. updatedAt drives last-write-wins sync;
// deletedAt is a tombstone so deletes sync too.
export type Task = {
  id: string;
  title: string;
  category: (typeof TASK_CATEGORIES)[number];
  status: (typeof TASK_STATUSES)[number];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

class TendDB extends Dexie {
  habits!: Table<Habit, number>;
  entries!: Table<Entry, number>;
  taps!: Table<Tap, number>;
  tasks!: Table<Task, string>;

  constructor() {
    super('tend');
    this.version(1).stores({
      habits: '++id, order, archivedAt',
      entries: '++id, habitId, date, [habitId+date]',
    });
    this.version(2).stores({
      habits: '++id, order, archivedAt',
      entries: '++id, habitId, date, [habitId+date]',
    }).upgrade(async (tx) => {
      const entries = await tx.table('entries').toArray();
      const groups = new Map<string, typeof entries>();
      for (const e of entries) {
        const k = `${e.habitId}|${e.date}`;
        const arr = groups.get(k) ?? [];
        arr.push(e);
        groups.set(k, arr);
      }
      for (const [, arr] of groups) {
        if (arr.length <= 1) continue;
        const winner = arr.reduce((acc, cur) => (cur.value > acc.value ? cur : acc), arr[0]);
        const losers = arr.filter((x) => x.id !== winner.id);
        await tx.table('entries').bulkDelete(losers.map((x) => x.id));
      }
    });
    // v3: per-tap timeline. Seed taps from existing entries so historical
    // data still shows something in the today log on first open.
    this.version(3).stores({
      habits: '++id, order, archivedAt',
      entries: '++id, habitId, date, [habitId+date]',
      taps: '++id, habitId, date, ts, [habitId+date]',
    }).upgrade(async (tx) => {
      const entries = await tx.table('entries').toArray();
      const seeded = entries
        .filter((e) => e.value > 0)
        .map((e) => ({
          habitId: e.habitId,
          date: e.date,
          delta: e.value,
          value: e.value,
          ts: e.updatedAt ?? e.createdAt,
        }));
      if (seeded.length) await tx.table('taps').bulkAdd(seeded);
    });
    // v4: tasks synced with drift.
    this.version(4).stores({
      habits: '++id, order, archivedAt',
      entries: '++id, habitId, date, [habitId+date]',
      taps: '++id, habitId, date, ts, [habitId+date]',
      tasks: 'id, status, updatedAt',
    });
  }
}

export const db = new TendDB();

export async function seedIfEmpty() {
  const count = await db.habits.count();
  if (count > 0) return;
  const now = new Date().toISOString();
  await db.habits.bulkAdd([
    { name: 'make bed', emoji: '🛏️', target: 1, unit: '', order: 0, createdAt: now },
    { name: 'water', emoji: '💧', target: 8, unit: 'glasses', order: 1, createdAt: now },
    { name: 'exercise', emoji: '💪', target: 1, unit: '', order: 2, createdAt: now },
    { name: 'read', emoji: '📚', target: 30, unit: 'min', order: 3, createdAt: now },
  ]);
}
