import type { Habit, Entry } from '../db';
import { yearGridDays, yearToDateGridDays, todayKey } from '../lib/dates';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

type Props = {
  habit: Habit;
  entries: Entry[];
  onCellClick?: (date: string) => void;
  size?: 'sm' | 'md';
  range?: 'ytd' | 'rolling'; // default 'ytd' = Jan 1 through this week
  weeks?: number; // only when range = 'rolling'
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun..Sat

export default function Heatmap({ habit, entries, onCellClick, size = 'sm', range = 'ytd', weeks }: Props) {
  const today = todayKey();
  const byDate = new Map(entries.map((e) => [e.date, e]));

  let allDays: string[];
  if (range === 'ytd') {
    allDays = yearToDateGridDays();
  } else {
    allDays = yearGridDays();
    const totalCols = 53;
    const visibleWeeks = Math.min(weeks ?? totalCols, totalCols);
    allDays = allDays.slice((totalCols - visibleWeeks) * 7);
  }

  const cols: string[][] = [];
  for (let c = 0; c < allDays.length / 7; c++) {
    cols.push(allDays.slice(c * 7, c * 7 + 7));
  }

  const cellPx = size === 'md' ? 16 : 11;
  const gapPx = size === 'md' ? 4 : 3;

  function shade(d: string) {
    const e = byDate.get(d);
    if (!e || e.value <= 0) return null;
    const ratio = Math.min(1, e.value / habit.target);
    if (ratio >= 1) return 'bg-white';
    if (ratio >= 0.66) return 'bg-white/65';
    if (ratio >= 0.33) return 'bg-white/40';
    return 'bg-white/25';
  }

  // Group columns by "MMM yyyy" so we can render the month label only over its actual span.
  type MonthGroup = { key: string; mmm: string; year: number; startCol: number; span: number };
  const groups: MonthGroup[] = [];
  cols.forEach((col, i) => {
    const ref = col[0];
    if (!ref) return;
    const d = parseISO(ref);
    const mmm = format(d, 'MMM');
    const year = d.getFullYear();
    const key = `${mmm}-${year}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.span += 1;
    } else {
      groups.push({ key, mmm, year, startCol: i, span: 1 });
    }
  });
  // Suppress slivers (<2 cols) — usually the partial previous-year sliver
  // at the start of a YTD view (e.g. Dec 28 - Jan 3 in the first column).
  const visibleGroups = groups.filter((g) => g.span >= 2);
  // Only the first visible group gets the year suffix.
  visibleGroups.forEach((g, idx) => {
    (g as MonthGroup & { display: string }).display = idx === 0 ? `${g.mmm} ${g.year}` : g.mmm;
  });

  const colW = cellPx + gapPx;
  const labelRowWidth = cols.length * colW - gapPx;

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="inline-block">
        {/* Month labels */}
        <div
          className="relative mb-1.5 text-[10px] uppercase tracking-wider text-muted"
          style={{ width: `${labelRowWidth}px`, height: '14px' }}
        >
          {visibleGroups.map((g) => (
            <span
              key={g.key}
              className="absolute whitespace-nowrap"
              style={{ left: `${g.startCol * colW}px` }}
            >
              {(g as MonthGroup & { display: string }).display}
            </span>
          ))}
        </div>

        {/* Grid + right-side day labels */}
        <div className="flex" style={{ gap: `${gapPx}px` }}>
          {cols.map((col, i) => (
            <div key={i} className="flex flex-col" style={{ gap: `${gapPx}px` }}>
              {col.map((d) => {
                const future = d > today;
                const isToday = d === today;
                const fill = shade(d);
                const cellStyle = { width: `${cellPx}px`, height: `${cellPx}px` };
                const cell = (
                  <div
                    title={d}
                    style={cellStyle}
                    className={clsx(
                      'rounded-[3px]',
                      fill ?? 'bg-surface2',
                      future && 'opacity-30',
                      isToday && !fill && 'ring-1 ring-white/40',
                    )}
                  />
                );
                if (future || !onCellClick) return <div key={d}>{cell}</div>;
                return (
                  <button
                    key={d}
                    onClick={() => onCellClick(d)}
                    className="block p-0 m-0 leading-none active:scale-90 transition-transform"
                    style={cellStyle}
                    aria-label={`Log ${d}`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Day-of-week labels on the right */}
          <div
            className="flex flex-col text-[9px] text-muted pl-2"
            style={{ gap: `${gapPx}px` }}
          >
            {DAYS.map((d, i) => (
              <div
                key={i}
                style={{ height: `${cellPx}px`, lineHeight: `${cellPx}px` }}
                className="leading-none"
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
