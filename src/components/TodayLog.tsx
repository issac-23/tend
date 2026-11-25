import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import type { Habit, Tap } from '../db';
import { db } from '../db';
import { undoTap, restoreTap } from '../lib/entries';
import { undo as hapticUndo } from '../lib/haptic';
import clsx from 'clsx';
import Toast from './Toast';

type Props = {
  habits: Habit[];
  taps: Tap[]; // today's taps only
  onOpen?: (habit: Habit) => void;
};

export default function TodayLog({ habits, taps, onOpen }: Props) {
  const byId = new Map(habits.map((h) => [h.id!, h]));
  const rows = taps
    .filter((t) => byId.has(t.habitId))
    .slice()
    .sort((a, b) => b.ts.localeCompare(a.ts));

  const [undone, setUndone] = useState<Tap | null>(null);

  function handleUndo(e: React.MouseEvent, tap: Tap) {
    e.stopPropagation();
    hapticUndo();
    setUndone(tap);
    void undoTap(db, tap.id!);
  }

  function handleRestore() {
    if (!undone) return;
    void restoreTap(db, undone);
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-2 px-1">Today's activity</div>
        <div className="bg-surface rounded-2xl px-4 py-5 text-xs text-muted text-center">
          Nothing logged yet today.
        </div>
        {undone && (
          <Toast
            label="Undone."
            actionLabel="Restore"
            onAction={handleRestore}
            onDismiss={() => setUndone(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] uppercase tracking-wider text-muted">Today's activity</div>
        <div className="text-[10px] text-muted tabular-nums">{rows.length} {rows.length === 1 ? 'tap' : 'taps'}</div>
      </div>
      <ul className="bg-surface rounded-2xl divide-y divide-border/40 overflow-hidden">
        {rows.map((t) => {
          const habit = byId.get(t.habitId)!;
          const met = t.value >= habit.target;
          const positive = t.delta > 0;
          return (
            <li key={t.id} className="flex items-center pr-2">
              <button
                onClick={() => onOpen?.(habit)}
                className="flex-1 flex items-center gap-3 px-4 py-2.5 text-left active:bg-surface2/40 transition-colors min-w-0"
              >
                <span className="text-base shrink-0">{habit.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{habit.name}</div>
                </div>
                <span
                  className={clsx(
                    'text-[11px] tabular-nums shrink-0 px-1.5 py-0.5 rounded',
                    positive ? 'bg-white/10 text-text' : 'bg-surface2 text-muted',
                  )}
                >
                  {positive ? '+' : ''}{t.delta}
                </span>
                <span
                  className={clsx(
                    'text-xs tabular-nums shrink-0',
                    met ? 'text-text' : 'text-muted',
                  )}
                >
                  {t.value}/{habit.target}
                </span>
                <span className="text-[11px] text-muted tabular-nums shrink-0 w-14 text-right">
                  {format(parseISO(t.ts), 'h:mm a')}
                </span>
              </button>
              <button
                onClick={(e) => handleUndo(e, t)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted active:scale-90 active:text-text transition-transform"
                aria-label="Undo this tap"
                title="Undo this tap"
              >
                <X size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      {undone && (
        <Toast
          label="Undone."
          actionLabel="Restore"
          onAction={handleRestore}
          onDismiss={() => setUndone(null)}
        />
      )}
    </div>
  );
}
