import { useEffect, useMemo, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Habit } from '../db';
import { Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import HabitCard from '../components/HabitCard';
import HabitSheet from '../components/HabitSheet';
import HabitDialog from '../components/HabitDialog';
import TodayLog from '../components/TodayLog';
import { quoteForToday } from '../lib/quotes';
import { useDayKey } from '../lib/useDayKey';
import { success as hapticSuccess } from '../lib/haptic';

export default function Today() {
  const [selected, setSelected] = useState<Habit | null>(null);
  const [adding, setAdding] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const wasAllDone = useRef(false);

  const today = useDayKey();
  const habits = useLiveQuery(() =>
    db.habits.filter((h) => !h.archivedAt && !h.onDeckAt).sortBy('order'),
  );
  const entries = useLiveQuery(() => db.entries.toArray());
  const todayTaps = useLiveQuery(() => db.taps.where('date').equals(today).toArray(), [today]);
  const quote = useMemo(() => quoteForToday(new Date()), [today]);
  const totalHabits = habits?.length ?? 0;
  const doneCount = habits
    ? habits.filter((h) => {
        const e = entries?.find((x) => x.habitId === h.id && x.date === today);
        return e && e.value >= h.target;
      }).length
    : 0;
  const allDone = totalHabits > 0 && doneCount === totalHabits;

  // Fire celebration only on the transition into "all done"
  useEffect(() => {
    if (allDone && !wasAllDone.current) {
      wasAllDone.current = true;
      setCelebrate(true);
      hapticSuccess();
      const t = setTimeout(() => setCelebrate(false), 1800);
      return () => clearTimeout(t);
    }
    if (!allDone) wasAllDone.current = false;
  }, [allDone]);

  if (!habits || !entries) return null;

  const entriesByHabit = new Map<number, typeof entries>();
  for (const e of entries) {
    const arr = entriesByHabit.get(e.habitId) ?? [];
    arr.push(e);
    entriesByHabit.set(e.habitId, arr);
  }

  const progressPct = totalHabits === 0 ? 0 : Math.round((doneCount / totalHabits) * 100);

  return (
    <div className="px-4 pt-6 animate-fade-in">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted">{format(new Date(), "EEEE · MMM d")}</div>
          <h1 className="text-2xl font-medium mt-1">Today</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center active:scale-95"
          aria-label="Add habit"
        >
          <Plus size={18} />
        </button>
      </div>

      {totalHabits > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted mb-1.5">
            <span>Today's progress</span>
            <span className="tabular-nums">{doneCount}/{totalHabits}</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all duration-500',
                allDone ? 'bg-white' : 'bg-white/60',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <blockquote className="bg-surface/60 border-l-2 border-white/30 rounded-r-xl pl-4 pr-3 py-3 mb-4">
        <p className="text-[15px] text-text/95 leading-relaxed italic">"{quote.text}"</p>
        <footer className="text-xs text-muted mt-2">— {quote.by}</footer>
      </blockquote>

      {allDone && (
        <div
          className={clsx(
            'mb-4 px-3 py-2.5 rounded-xl flex items-center gap-2',
            celebrate
              ? 'bg-white text-black animate-pop'
              : 'bg-surface border border-white/20 text-text',
          )}
        >
          <Check size={14} strokeWidth={3} />
          <span className="text-xs font-medium">All habits done today. Nicely done.</span>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="text-center text-muted text-sm mt-20">
          No habits yet.
          <button onClick={() => setAdding(true)} className="block mx-auto mt-3 px-4 py-2 rounded-full bg-surface text-text text-sm">
            Add your first
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              entries={entriesByHabit.get(h.id!) ?? []}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      {habits.length > 0 && (
        <TodayLog
          habits={habits}
          taps={todayTaps ?? []}
          onOpen={setSelected}
        />
      )}

      <HabitSheet habit={selected} onClose={() => setSelected(null)} />
      {adding && <HabitDialog onClose={() => setAdding(false)} />}
    </div>
  );
}
