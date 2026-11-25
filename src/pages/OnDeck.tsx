import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db, type Habit } from '../db';
import { Layers, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function OnDeck() {
  const onDeck = useLiveQuery(() =>
    db.habits
      .filter((h) => !h.archivedAt && !!h.onDeckAt)
      .toArray()
      .then((arr) => arr.sort((a, b) => (b.onDeckAt ?? '').localeCompare(a.onDeckAt ?? ''))),
  );

  async function activate(h: Habit) {
    if (!h.id) return;
    // Place at the end of the active list, preserving relative order of existing actives.
    const count = await db.habits.filter((x) => !x.archivedAt && !x.onDeckAt).count();
    await db.habits.update(h.id, { onDeckAt: undefined, order: count });
  }

  if (!onDeck) return null;

  return (
    <div className="px-4 pt-6 animate-fade-in">
      <h1 className="text-2xl font-medium mb-1">On-deck</h1>
      <p className="text-[11px] text-muted mb-5 leading-relaxed">
        Habits you're considering but not tracking yet. They keep all their history.
        Activate one to add it back to Today.
      </p>

      {onDeck.length === 0 ? (
        <div className="bg-surface rounded-2xl px-4 py-10 text-center text-sm text-muted">
          <Layers size={20} className="mx-auto mb-3 opacity-60" />
          <p className="mb-1">Nothing on-deck.</p>
          <p className="text-[11px]">
            From any habit, tap the pencil and choose <span className="text-text">Move to on-deck</span>.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1 mt-4 text-[11px] text-text/80 underline"
          >
            Back to Today <ChevronRight size={11} />
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {onDeck.map((h) => (
            <li key={h.id} className="bg-surface rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{h.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{h.name}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  Target {h.target}{h.unit ? ` ${h.unit}` : ''}/day
                  {h.onDeckAt && (
                    <span> · parked {format(parseISO(h.onDeckAt), 'MMM d')}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => activate(h)}
                className="shrink-0 px-3 py-2 rounded-lg bg-white text-black text-xs font-medium active:scale-95 transition-transform"
              >
                Activate
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
