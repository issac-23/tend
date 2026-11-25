import { useEffect, useState } from 'react';
import { db, type Habit } from '../db';
import { todayKey, prettyDate, isToday } from '../lib/dates';
import { X, Trash2, Pencil } from 'lucide-react';
import HabitDialog from './HabitDialog';

type Props = {
  habit: Habit | null;
  date?: string; // defaults to today
  onClose: () => void;
};

export default function HabitSheet({ habit, date, onClose }: Props) {
  const target = date ?? todayKey();
  const [value, setValue] = useState(0);
  const [note, setNote] = useState('');
  const [entryId, setEntryId] = useState<number | undefined>();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!habit) return;
    (async () => {
      const e = await db.entries.where({ habitId: habit.id!, date: target }).first();
      setValue(e?.value ?? 0);
      setNote(e?.note ?? '');
      setEntryId(e?.id);
    })();
  }, [habit, target]);

  if (!habit) return null;

  async function save() {
    if (!habit) return;
    const now = new Date().toISOString();
    await db.transaction('rw', db.entries, db.taps, async () => {
      const existing = entryId ? await db.entries.get(entryId) : undefined;
      const prevValue = existing?.value ?? 0;
      if (entryId) {
        await db.entries.update(entryId, {
          value,
          note: note.trim() || undefined,
          updatedAt: now,
        });
      } else if (value > 0 || note.trim()) {
        await db.entries.add({
          habitId: habit!.id!,
          date: target,
          value,
          note: note.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
      const delta = value - prevValue;
      if (delta !== 0) {
        await db.taps.add({
          habitId: habit!.id!,
          date: target,
          delta,
          value,
          ts: now,
        });
      }
    });
    onClose();
  }

  async function clearEntry() {
    if (!habit || !entryId) {
      onClose();
      return;
    }
    if (!confirm(`Clear ${isToday(target) ? "today's" : prettyDate(target) + "'s"} entry for "${habit.name}"?`)) return;
    await db.transaction('rw', db.entries, db.taps, async () => {
      await db.entries.delete(entryId);
      await db.taps.where({ habitId: habit!.id!, date: target }).delete();
    });
    onClose();
  }

  const headerLabel = isToday(target) ? 'Today' : prettyDate(target);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-3xl p-5 pb-8 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{habit.emoji}</span>
            <div>
              <div className="text-base font-medium">{habit.name}</div>
              <div className="text-xs text-muted">Target: {habit.target}{habit.unit ? ` ${habit.unit}` : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(true)} className="text-muted p-1" aria-label="Edit habit">
              <Pencil size={18} />
            </button>
            <button onClick={onClose} className="text-muted p-1" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted uppercase tracking-wider">{headerLabel}</label>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setValue((v) => Math.max(0, v - 1))}
              className="w-10 h-10 rounded-full bg-surface2 text-lg"
            >−</button>
            <div className="flex-1 text-center text-3xl font-light tabular-nums">
              {value}<span className="text-muted text-base"> / {habit.target}</span>
            </div>
            <button
              onClick={() => setValue((v) => v + 1)}
              className="w-10 h-10 rounded-full bg-surface2 text-lg"
            >+</button>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs text-muted uppercase tracking-wider">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="how did it go?"
            rows={3}
            className="w-full mt-2 bg-surface2 rounded-xl p-3 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearEntry}
            disabled={!entryId}
            className="px-3 py-3 rounded-xl bg-surface2 text-muted active:scale-95 transition-transform disabled:opacity-30"
            aria-label="Clear entry"
            title="Clear entry"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={save}
            className="flex-1 py-3 rounded-xl bg-white text-black font-medium active:scale-95 transition-transform"
          >
            Save
          </button>
        </div>
        <p className="text-[10px] text-muted text-center mt-2">
          Trash clears just this entry. To delete the habit, tap the pencil → "Delete habit".
        </p>
      </div>
      {editing && <HabitDialog habit={habit} onClose={() => setEditing(false)} />}
    </div>
  );
}
