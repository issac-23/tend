import type { Habit, Entry } from '../db';
import { lastNDays } from './dates';
import { format, parseISO } from 'date-fns';

const fmtShort = (s: string) => format(parseISO(s), 'EEE M/d');
const fmtFull = (s: string) => format(parseISO(s), 'M/d/yyyy');

export function buildWeekSummary(habits: Habit[], entries: Entry[]) {
  const days = lastNDays(7);
  const start = days[0];
  const end = days[days.length - 1];
  const lines: string[] = [];
  lines.push(`Week: ${fmtFull(start)} – ${fmtFull(end)}`);
  lines.push('');
  for (const h of habits) {
    const hEntries = entries.filter((e) => e.habitId === h.id && days.includes(e.date));
    const metEntries = hEntries.filter((e) => e.value >= h.target).sort((a, b) => a.date.localeCompare(b.date));
    const missedDays = days.filter((d) => !metEntries.find((e) => e.date === d));
    const total = hEntries.reduce((s, e) => s + e.value, 0);

    lines.push(
      `- ${h.emoji} ${h.name}: ${metEntries.length}/7 days${h.unit ? ` · total ${total} ${h.unit}` : ''}`,
    );
    if (metEntries.length > 0) {
      lines.push(`    completed: ${metEntries.map((e) => fmtShort(e.date)).join(', ')}`);
    }
    if (missedDays.length > 0 && missedDays.length < 7) {
      lines.push(`    missed: ${missedDays.map(fmtShort).join(', ')}`);
    }
    const notes = hEntries.filter((e) => e.note);
    if (notes.length) {
      for (const n of notes) lines.push(`    note (${fmtShort(n.date)}): ${n.note}`);
    }
  }
  return lines.join('\n');
}

export function buildClaudePrompt(summary: string) {
  return `Here's my habit data from this past week. I'd like to reflect on it with you.

Please:
1. Give me an honest read of the week — point out patterns, call out where I'm being soft on myself, don't flatter me.
2. Ask me 2-3 sharp reflection questions tailored to specifics in the data (cite the actual days/streaks).
3. Suggest ONE focused change for next week — not a list.

After we talk, I'd like you to write me a short markdown reflection block I can paste into my Obsidian journal.

${summary}`;
}
