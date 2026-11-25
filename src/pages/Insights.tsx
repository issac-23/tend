import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Habit } from '../db';
import { currentStreak } from '../lib/streaks';
import { todayKey } from '../lib/dates';
import { Flame, Check, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import Heatmap from '../components/Heatmap';
import HabitDetail from '../components/HabitDetail';

export default function Insights() {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.archivedAt && !h.onDeckAt).sortBy('order'));
  const entries = useLiveQuery(() => db.entries.toArray());
  const [detail, setDetail] = useState<Habit | null>(null);

  if (!habits || !entries) return null;
  const today = todayKey();

  return (
    <div className="px-4 pt-6 animate-fade-in">
      <h1 className="text-2xl font-medium mb-1">Insights</h1>
      <p className="text-[11px] text-muted mb-5">Tap a habit for details.</p>

      {habits.length === 0 ? (
        <div className="text-center text-muted text-sm mt-20">Add a habit to see insights.</div>
      ) : (
        <div className="space-y-3">
          {habits.map((h) => {
            const hEntries = entries.filter((e) => e.habitId === h.id);
            const todayEntry = hEntries.find((e) => e.date === today);
            const todayValue = todayEntry?.value ?? 0;
            const todayMet = todayValue >= h.target;
            const met = hEntries.filter((e) => e.value >= h.target).length;
            const streak = currentStreak(h, hEntries);
            return (
              <button
                key={h.id}
                onClick={() => setDetail(h)}
                className="w-full bg-surface rounded-2xl p-4 text-left active:bg-surface2/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{h.emoji}</span>
                    <span className="text-sm font-medium truncate">{h.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] tabular-nums',
                        todayMet ? 'bg-white text-black' : 'bg-surface2 text-muted',
                      )}
                    >
                      {todayMet && <Check size={10} strokeWidth={3} />}
                      <span>{todayValue}/{h.target} today</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <div className="flex items-center gap-1">
                        <Flame size={12} className="text-orange-400" />
                        <span className="text-text text-sm tabular-nums">{streak}</span>
                      </div>
                      <span className="text-text text-sm tabular-nums">{met}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted" />
                  </div>
                </div>
                <Heatmap habit={h} entries={hEntries} range="ytd" />
              </button>
            );
          })}
        </div>
      )}

      {detail && <HabitDetail habit={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
