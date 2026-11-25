import { useState } from 'react';
import { db, type Habit } from '../db';
import { X } from 'lucide-react';

const EMOJIS = ['🛏️','💧','💪','📚','🧘','🍎','🚶','✍️','🎨','🎯','☀️','💊','🧹','🥗','🛌','🧠','🎵','📱','💼','🌱'];

type Props = {
  habit?: Habit; // present = edit mode
  onClose: () => void;
};

export default function HabitDialog({ habit, onClose }: Props) {
  const editing = !!habit;
  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '🎯');
  const [targetStr, setTargetStr] = useState(String(habit?.target ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? '');

  function parsedTarget(): number {
    const n = parseInt(targetStr, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  async function save() {
    if (!name.trim()) return;
    const target = parsedTarget();
    if (editing && habit?.id) {
      await db.habits.update(habit.id, {
        name: name.trim(),
        emoji,
        target,
        unit: unit.trim(),
      });
    } else {
      const count = await db.habits.count();
      await db.habits.add({
        name: name.trim(),
        emoji,
        target,
        unit: unit.trim(),
        order: count,
        createdAt: new Date().toISOString(),
      });
    }
    onClose();
  }

  async function archiveHabit() {
    if (!habit?.id) return;
    await db.habits.update(habit.id, { archivedAt: new Date().toISOString() });
    onClose();
  }

  async function moveToOnDeck() {
    if (!habit?.id) return;
    await db.habits.update(habit.id, { onDeckAt: new Date().toISOString() });
    onClose();
  }

  async function deletePermanently() {
    if (!habit?.id) return;
    if (!confirm(`Delete "${habit.name}" forever? This wipes every entry and tap. There's no undo.`)) return;
    await db.transaction('rw', db.habits, db.entries, db.taps, async () => {
      await db.entries.where('habitId').equals(habit.id!).delete();
      await db.taps.where('habitId').equals(habit.id!).delete();
      await db.habits.delete(habit.id!);
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-3xl p-5 pb-8 safe-bottom max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium">{editing ? 'Edit habit' : 'New habit'}</h2>
          <button onClick={onClose} className="text-muted p-1"><X size={20} /></button>
        </div>

        <input
          autoFocus={!editing}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. meditate"
          className="w-full bg-surface2 rounded-xl p-3 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-white/30"
        />

        <div className="mt-4">
          <label className="text-xs text-muted uppercase tracking-wider">Icon</label>
          <div className="grid grid-cols-10 gap-1 mt-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`aspect-square rounded-lg text-lg ${emoji === e ? 'bg-surface2 ring-1 ring-white/40' : 'bg-surface2/50'}`}
              >{e}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Target</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={targetStr}
              onChange={(e) => setTargetStr(e.target.value)}
              onBlur={() => setTargetStr(String(parsedTarget()))}
              className="w-full mt-2 bg-surface2 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Unit (optional)</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="min, reps, …"
              className="w-full mt-2 bg-surface2 rounded-xl p-3 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={!name.trim()}
          className="w-full mt-5 py-3 rounded-xl bg-white text-black font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {editing ? 'Save changes' : 'Add habit'}
        </button>

        {editing && (
          <>
            <button
              onClick={moveToOnDeck}
              className="w-full mt-3 py-3 rounded-xl bg-transparent border border-white/15 text-text/80 text-sm active:scale-95 transition-transform"
            >
              Move to on-deck
            </button>
            <p className="text-[11px] text-muted text-center mt-1 leading-snug">
              Parks the habit. Activate it later from the On-deck tab. History stays put.
            </p>
            <button
              onClick={archiveHabit}
              className="w-full mt-3 py-3 rounded-xl bg-transparent border border-white/15 text-text/80 text-sm active:scale-95 transition-transform"
            >
              Archive habit
            </button>
            <p className="text-[11px] text-muted text-center mt-1 leading-snug">
              Stronger than on-deck. Hidden from every tab. Restore from Settings.
            </p>
            <button
              onClick={deletePermanently}
              className="w-full mt-3 py-2 text-xs text-red-400/80 active:scale-95 transition-transform"
            >
              Delete permanently
            </button>
          </>
        )}
      </div>
    </div>
  );
}
