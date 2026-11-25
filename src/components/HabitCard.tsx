import { useState } from 'react';
import { db, type Habit, type Entry } from '../db';
import { todayKey } from '../lib/dates';
import { currentStreak } from '../lib/streaks';
import { adjustEntry } from '../lib/entries';
import { tap as hapticTap } from '../lib/haptic';
import { Flame, StickyNote } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  habit: Habit;
  entries: Entry[];
  onOpen: (habit: Habit) => void;
};

export default function HabitCard({ habit, entries, onOpen }: Props) {
  const [pop, setPop] = useState(false);
  const today = todayKey();
  const todayEntry = entries.find((e) => e.date === today);
  const value = todayEntry?.value ?? 0;
  const met = value >= habit.target;
  const streak = currentStreak(habit, entries);
  const hasNote = !!todayEntry?.note;
  const isNumeric = habit.target > 1;

  async function adjust(delta: number) {
    setPop(true);
    setTimeout(() => setPop(false), 200);
    await adjustEntry(db, habit, today, delta);
  }

  function quickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    hapticTap(); // sync, inside the user gesture so the browser honors it
    void adjust(+1);
  }

  function dec(e: React.MouseEvent) {
    e.stopPropagation();
    hapticTap();
    void adjust(-1);
  }

  function inc(e: React.MouseEvent) {
    e.stopPropagation();
    hapticTap();
    void adjust(+1);
  }

  const display = habit.unit
    ? `${value}${habit.unit === 'min' ? 'm' : ''}/${habit.target}${habit.unit === 'min' ? 'm' : ''}`
    : `${value}/${habit.target}`;

  return (
    <button
      onClick={() => onOpen(habit)}
      className={clsx(
        'relative aspect-square w-full rounded-2xl p-3 flex flex-col justify-between text-left transition-all active:scale-[0.97]',
        met ? 'bg-surface2 ring-1 ring-white/20' : 'bg-surface',
        pop && 'animate-pop',
      )}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {hasNote && <StickyNote size={10} className="text-muted" />}
        {streak > 0 && (
          <div className="flex items-center gap-0.5 text-[10px] text-muted">
            <Flame size={10} className={met ? 'text-orange-400' : ''} />
            {streak}
          </div>
        )}
      </div>
      <div
        onClick={quickAdd}
        className="text-xl select-none cursor-pointer"
        role="button"
      >
        {habit.emoji}
      </div>
      <div>
        {isNumeric ? (
          <div className="flex items-center gap-1 -ml-1">
            <span
              onClick={dec}
              role="button"
              aria-label="Decrement"
              className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none',
                value > 0 ? 'bg-surface2/70 text-text active:scale-90' : 'opacity-0 pointer-events-none',
              )}
            >
              −
            </span>
            <span className={clsx('text-sm font-medium tabular-nums flex-1', met ? 'text-text' : 'text-text/90')}>
              {display}
            </span>
            <span
              onClick={inc}
              role="button"
              aria-label="Increment"
              className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none mr-0.5',
                value < habit.target ? 'bg-surface2/70 text-text active:scale-90' : 'opacity-0 pointer-events-none',
              )}
            >
              +
            </span>
          </div>
        ) : (
          <div className={clsx('text-sm font-medium tabular-nums', met ? 'text-text' : 'text-text/90')}>
            {display}
          </div>
        )}
        <div className="text-[11px] text-muted truncate mt-0.5">{habit.name}</div>
      </div>
    </button>
  );
}
