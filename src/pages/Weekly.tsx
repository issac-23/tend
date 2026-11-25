import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Check, Sparkles } from 'lucide-react';
import { db } from '../db';
import { buildWeekSummary, buildClaudePrompt } from '../lib/ai';
import { isSunday } from '../lib/dates';

export default function Weekly() {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.archivedAt && !h.onDeckAt).sortBy('order'));
  const entries = useLiveQuery(() => db.entries.toArray());
  const [copiedStats, setCopiedStats] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!habits || !entries) return null;

  const summary = buildWeekSummary(habits, entries);
  const claudePrompt = buildClaudePrompt(summary);

  async function copyStats() {
    await navigator.clipboard.writeText(summary);
    setCopiedStats(true);
    setTimeout(() => setCopiedStats(false), 1600);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(claudePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1600);
  }

  return (
    <div className="px-4 pt-6 animate-fade-in">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted">{isSunday() ? 'Sunday ritual' : 'Weekly'}</div>
          <h1 className="text-2xl font-medium mt-1">Weekly</h1>
        </div>
      </div>

      {isSunday() && (
        <div className="bg-surface2/60 border border-white/10 rounded-2xl p-3 mb-4 flex items-start gap-2">
          <Sparkles size={14} className="text-text mt-0.5 shrink-0" />
          <p className="text-xs text-text/90 leading-relaxed">
            It's Sunday. Take five minutes to reflect on the week before starting a fresh one.
          </p>
        </div>
      )}

      <section className="bg-surface rounded-2xl p-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-muted mb-2">Stats (last 7 days)</div>
        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-text/90">{summary}</pre>
      </section>

      <button
        onClick={copyPrompt}
        className="w-full py-3 rounded-xl bg-white text-black font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform mb-2"
      >
        {copiedPrompt ? <Check size={16} /> : <Copy size={16} />}
        {copiedPrompt ? 'Copied — paste into Claude Code' : 'Copy weekly prompt'}
      </button>
      <p className="text-[11px] text-muted text-center leading-relaxed mb-4">
        Paste into Claude Code in your terminal (or claude.ai if you're on the go). Nothing is sent until you paste — no API charges, no quota burned.
      </p>

      <button
        onClick={copyStats}
        className="w-full py-2.5 rounded-xl bg-surface text-text text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        {copiedStats ? <Check size={14} /> : <Copy size={14} />}
        {copiedStats ? 'Copied' : 'Copy raw stats only (for Obsidian)'}
      </button>
    </div>
  );
}
