import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Trash2, Clock } from 'lucide-react';
import clsx from 'clsx';
import { db, TASK_CATEGORIES, type Task } from '../db';
import { addTaskLocal, saveTask, syncTasks, syncToken } from '../lib/tasksync';

export default function Tasks() {
  const tasks = useLiveQuery(() =>
    db.tasks.filter((t) => t.deletedAt === null && (t.status === 'todo' || t.status === 'pending')).toArray(),
  );
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Task['category']>('life');
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addTaskLocal(title, category);
    setTitle('');
  }

  async function refresh() {
    setBusy(true);
    await syncTasks();
    setBusy(false);
  }

  if (!tasks) return null;
  const sorted = [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="px-4 pt-6 animate-fade-in">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-medium">Tasks</h1>
        {syncToken() && (
          <button onClick={refresh} className="text-[11px] text-muted underline">
            {busy ? 'syncing…' : 'sync now'}
          </button>
        )}
      </div>
      {!syncToken() && (
        <p className="text-[11px] text-muted mb-4">Add your sync token in Settings to share these with drift.</p>
      )}

      <form onSubmit={add} className="flex gap-2 mb-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          maxLength={200}
          className="flex-1 min-w-0 bg-surface rounded-xl px-3 py-2 text-sm outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Task['category'])}
          className="bg-surface rounded-xl px-2 text-xs"
        >
          {TASK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </form>

      {sorted.length === 0 ? (
        <div className="bg-surface rounded-2xl px-4 py-10 text-center text-sm text-muted">Nothing to do.</div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) => (
            <li key={t.id} className="bg-surface rounded-2xl p-3 flex items-center gap-3">
              <button
                aria-label="Complete"
                onClick={() => saveTask(t.id, { status: 'completed' })}
                className="w-7 h-7 rounded-full border border-border grid place-items-center shrink-0 active:scale-95"
              >
                <Check size={14} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{t.title}</div>
                <div className="text-[11px] text-muted">{t.category}{t.status === 'pending' ? ' · pending' : ''}</div>
              </div>
              <button
                aria-label="Toggle pending"
                onClick={() => saveTask(t.id, { status: t.status === 'pending' ? 'todo' : 'pending' })}
                className={clsx('p-1', t.status === 'pending' ? 'text-text' : 'text-muted')}
              >
                <Clock size={15} />
              </button>
              <button aria-label="Delete" onClick={() => saveTask(t.id, { deleted: true })} className="p-1 text-muted">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
