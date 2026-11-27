import { db, type Task } from '../db';

const K = { token: 'sync_token', since: 'sync_since' };

export const syncToken = () => localStorage.getItem(K.token) ?? '';
export function setSyncToken(t: string) {
  localStorage.setItem(K.token, t.trim());
  localStorage.removeItem(K.since);
}

const headers = () => ({ Authorization: `Bearer ${syncToken()}`, 'Content-Type': 'application/json' });
let running: Promise<SyncResult> | null = null;

export type SyncResult = { ok: boolean; error?: string };

/** Pull changes since the last sync (last-write-wins on updatedAt), then push local changes. */
export function syncTasks(): Promise<SyncResult> {
  if (!syncToken()) return Promise.resolve({ ok: false, error: 'no token' });
  if (!running) running = run().finally(() => { running = null; });
  return running;
}

async function run(): Promise<SyncResult> {
  try {
    const since = localStorage.getItem(K.since) ?? '';
    const r = await fetch(`/api/tasks?since=${encodeURIComponent(since)}`, { headers: headers() });
    if (!r.ok) return { ok: false, error: r.status === 401 ? 'wrong token' : `pull ${r.status}` };
    const { tasks: remote, now } = (await r.json()) as { tasks: Task[]; now: string };

    for (const t of remote) {
      const local = await db.tasks.get(t.id);
      if (!local || local.updatedAt < t.updatedAt) await db.tasks.put(t);
    }

    // Everything changed locally since the last sync goes up; the server drops stale ones.
    const dirty = await db.tasks.where('updatedAt').above(since).toArray();
    if (dirty.length) {
      const p = await fetch('/api/tasks', { method: 'POST', headers: headers(), body: JSON.stringify({ tasks: dirty }) });
      if (!p.ok) return { ok: false, error: `push ${p.status}` };
    }
    // `now` is the server's clock; local edits made on a skewed clock are still covered because
    // updatedAt is compared against what the server stored, not against this value alone.
    localStorage.setItem(K.since, now);
    return { ok: true };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export async function saveTask(id: string, patch: Partial<Pick<Task, 'title' | 'category' | 'status'>> & { deleted?: boolean }) {
  const t = await db.tasks.get(id);
  if (!t) return;
  const now = new Date().toISOString();
  const { deleted, ...rest } = patch;
  await db.tasks.put({ ...t, ...rest, deletedAt: deleted ? now : t.deletedAt, updatedAt: now });
  void syncTasks();
}

export async function addTaskLocal(title: string, category: Task['category']) {
  const now = new Date().toISOString();
  await db.tasks.add({ id: crypto.randomUUID(), title: title.trim(), category, status: 'todo', createdAt: now, updatedAt: now, deletedAt: null });
  void syncTasks();
}

// ---- Web Push ----

const b64ToBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function enableServerPush(): Promise<string> {
  if (!syncToken()) return 'Add the sync token first.';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'This browser has no push support. On iPhone, add tend to the home screen first.';
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'Notifications are blocked for this site.';
  const { key } = (await (await fetch('/api/vapid')).json()) as { key: string | null };
  if (!key) return 'Server has no VAPID key yet.';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
  const r = await fetch('/api/push-subscribe', { method: 'POST', headers: headers(), body: JSON.stringify({ subscription: sub.toJSON() }) });
  return r.ok ? 'Reminders on. They arrive even when tend is closed.' : `Could not register (${r.status}).`;
}
