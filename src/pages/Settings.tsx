import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Habit } from '../db';
import { notifEnabled, setNotifEnabled, notifHour, setNotifHour, requestNotifPermission, registerPeriodicSync } from '../lib/notify';
import { Download, Upload, Bell, ArchiveRestore, Trash2 } from 'lucide-react';
import HabitReorderList from '../components/HabitReorderList';

export default function Settings() {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.archivedAt && !h.onDeckAt).sortBy('order'));
  const archived = useLiveQuery(() => db.habits.filter((h) => !!h.archivedAt).toArray());
  const [notif, setNotif] = useState(notifEnabled());
  const [hour, setHour] = useState(notifHour());
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  async function toggleNotif() {
    const next = !notif;
    if (next) {
      const p = await requestNotifPermission();
      setPermission(p);
      if (p !== 'granted') return;
      await registerPeriodicSync();
    }
    setNotif(next);
    setNotifEnabled(next);
  }

  function onHourChange(h: number) {
    setHour(h);
    setNotifHour(h);
  }

  async function exportJson() {
    const [hs, es] = await Promise.all([db.habits.toArray(), db.entries.toArray()]);
    const blob = new Blob([JSON.stringify({ habits: hs, entries: es, exportedAt: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tend-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restoreHabit(h: Habit) {
    if (!h.id) return;
    const count = await db.habits.filter((x) => !x.archivedAt && !x.onDeckAt).count();
    await db.habits.update(h.id, { archivedAt: undefined, order: count });
  }

  async function purgeArchived(h: Habit) {
    if (!h.id) return;
    if (!confirm(`Delete "${h.name}" forever? This wipes every entry and tap. There's no undo.`)) return;
    await db.transaction('rw', db.habits, db.entries, db.taps, async () => {
      await db.entries.where('habitId').equals(h.id!).delete();
      await db.taps.where('habitId').equals(h.id!).delete();
      await db.habits.delete(h.id!);
    });
  }

  async function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.habits) || !Array.isArray(data.entries)) throw new Error('bad format');
      if (!confirm(`Replace current data with ${data.habits.length} habits and ${data.entries.length} entries?`)) return;
      await db.transaction('rw', db.habits, db.entries, async () => {
        await db.habits.clear();
        await db.entries.clear();
        await db.habits.bulkAdd(data.habits.map((h: { id?: number } & Record<string, unknown>) => { const { id: _id, ...rest } = h; void _id; return rest; }));
        await db.entries.bulkAdd(data.entries.map((en: { id?: number } & Record<string, unknown>) => { const { id: _id, ...rest } = en; void _id; return rest; }));
      });
      alert('Imported.');
    } catch (err) {
      alert('Could not import: ' + (err instanceof Error ? err.message : 'unknown error'));
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="px-4 pt-6 animate-fade-in">
      <h1 className="text-2xl font-medium mb-5">Settings</h1>

      <section className="bg-surface rounded-2xl p-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-muted mb-2">Habits</div>
        <p className="text-[11px] text-muted mb-3">Drag to reorder.</p>
        {habits ? <HabitReorderList habits={habits} /> : null}
      </section>

      <section className="bg-surface rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs uppercase tracking-wider text-muted">Daily reminder</div>
          <button
            onClick={toggleNotif}
            className={`relative w-11 h-6 rounded-full transition-colors ${notif && permission === 'granted' ? 'bg-white' : 'bg-surface2'}`}
            aria-pressed={notif}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${notif && permission === 'granted' ? 'bg-black translate-x-5' : 'bg-muted translate-x-0'}`} />
          </button>
        </div>
        <p className="text-[11px] text-muted mb-3 flex items-center gap-1">
          <Bell size={11} /> If habits are still pending after this hour, you'll get a nudge.
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">From</label>
          <select
            value={hour}
            onChange={(e) => onHourChange(parseInt(e.target.value))}
            disabled={!notif || permission !== 'granted'}
            className="bg-surface2 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
        {permission === 'denied' && (
          <p className="text-[11px] text-red-400 mt-2">Notifications are blocked. Enable in your browser settings.</p>
        )}
        <p className="text-[11px] text-muted mt-2 leading-relaxed">
          Most reliable while the app is open. Android Chrome can also fire when it's closed if you've installed tend as an app.
        </p>
      </section>

      {archived && archived.length > 0 && (
        <section className="bg-surface rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-wider text-muted mb-3">Archived</div>
          <ul className="space-y-2">
            {archived.map((h) => (
              <li key={h.id} className="flex items-center gap-2 bg-surface2 rounded-xl p-2.5">
                <span className="text-lg">{h.emoji}</span>
                <span className="text-sm flex-1 truncate">{h.name}</span>
                <button
                  onClick={() => restoreHabit(h)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 text-text text-[11px] flex items-center gap-1 active:scale-95 transition-transform"
                  aria-label={`Restore ${h.name}`}
                >
                  <ArchiveRestore size={12} /> Restore
                </button>
                <button
                  onClick={() => purgeArchived(h)}
                  className="w-8 h-8 rounded-lg text-red-400/70 flex items-center justify-center active:scale-90 transition-transform"
                  aria-label={`Delete ${h.name} permanently`}
                  title="Delete permanently"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-surface rounded-2xl p-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-muted mb-3">Backup</div>
        <div className="flex gap-2">
          <button
            onClick={exportJson}
            className="flex-1 py-2.5 rounded-xl bg-surface2 text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Download size={14} /> Export JSON
          </button>
          <label className="flex-1 py-2.5 rounded-xl bg-surface2 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform">
            <Upload size={14} /> Import
            <input type="file" accept="application/json" onChange={importJson} className="hidden" />
          </label>
        </div>
        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          Your data lives in this browser's storage. Export regularly so you don't lose it.
        </p>
      </section>

      <p className="text-[11px] text-muted text-center mt-6">tend · v0.3</p>
    </div>
  );
}
