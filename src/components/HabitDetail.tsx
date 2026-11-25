import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Habit } from '../db';
import { todayKey, prettyDate } from '../lib/dates';
import { currentStreak, longestStreak } from '../lib/streaks';
import { X, Flame, StickyNote } from 'lucide-react';
import clsx from 'clsx';
import Heatmap from './Heatmap';
import HabitSheet from './HabitSheet';

type Props = {
  habit: Habit;
  onClose: () => void;
};

export default function HabitDetail({ habit, onClose }: Props) {
  const entries = useLiveQuery(
    () => db.entries.where('habitId').equals(habit.id!).reverse().sortBy('date'),
    [habit.id],
  );
  const [editing, setEditing] = useState<string | null>(null);

  if (!entries) return null;

  const today = todayKey();
  const todayEntry = entries.find((e) => e.date === today);
  const todayValue = todayEntry?.value ?? 0;
  const todayMet = todayValue >= habit.target;
  const totalMet = entries.filter((e) => e.value >= habit.target).length;
  const streak = currentStreak(habit, entries);
  const longest = longestStreak(habit, entries);

  return (
    <div className="fixed inset-0 z-40 bg-bg animate-fade-in flex flex-col">
      <header className="flex items-center justify-between px-4 pt-6 pb-3 safe-top">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{habit.emoji}</span>
          <div className="min-w-0">
            <h2 className="text-lg font-medium truncate">{habit.name}</h2>
            <p className="text-xs text-muted">Target {habit.target}{habit.unit ? ` ${habit.unit}` : ''}/day</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted p-2" aria-label="Close">
          <X size={22} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 px-4">
        <div className="grid grid-cols-4 gap-2 mb-5">
          <Stat label="Today" value={`${todayValue}/${habit.target}`} highlight={todayMet} />
          <Stat label="Streak" value={String(streak)} icon={<Flame size={11} className="text-orange-400" />} />
          <Stat label="Best" value={String(longest)} />
          <Stat label="Total" value={String(totalMet)} />
        </div>

        <section className="bg-surface rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-muted">All time</div>
            <div className="text-[10px] text-muted">Tap a day to edit</div>
          </div>
          <Heatmap
            habit={habit}
            entries={entries}
            size="md"
            range="ytd"
            onCellClick={(date) => setEditing(date)}
          />
        </section>

        <section className="bg-surface rounded-2xl p-1">
          <div className="text-xs uppercase tracking-wider text-muted px-3 py-3">Recent entries</div>
          {entries.length === 0 ? (
            <div className="px-3 pb-4 text-xs text-muted">No entries yet.</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {entries.slice(0, 30).map((e) => {
                const met = e.value >= habit.target;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setEditing(e.date)}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-surface2/40 transition-colors"
                    >
                      <span
                        className={clsx(
                          'w-2 h-2 rounded-full shrink-0',
                          met ? 'bg-white' : 'bg-muted/40',
                        )}
                      />
                      <span className="text-sm flex-1 min-w-0 truncate">
                        {prettyDate(e.date)}
                      </span>
                      {e.note && <StickyNote size={12} className="text-muted shrink-0" />}
                      <span className="text-sm tabular-nums text-muted shrink-0">
                        {e.value}/{habit.target}
                      </span>
                    </button>
                    {e.note && (
                      <p className="px-6 pb-3 text-xs text-muted leading-relaxed -mt-1">
                        {e.note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <HabitSheet
        habit={editing ? habit : null}
        date={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'bg-surface rounded-xl p-2.5 flex flex-col items-center',
        highlight && 'bg-white text-black',
      )}
    >
      <div className={clsx('text-[10px] uppercase tracking-wider', highlight ? 'text-black/60' : 'text-muted')}>
        {label}
      </div>
      <div className="text-base font-medium tabular-nums mt-0.5 flex items-center gap-1">
        {icon}
        {value}
      </div>
    </div>
  );
}
