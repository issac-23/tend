import type { Habit, Entry } from '../db';
import { todayKey } from './dates';

const STORE = {
  enabled: 'notify_enabled',
  hour: 'notify_hour',
  lastFired: 'notify_last_fired',
};

export function notifEnabled() {
  return localStorage.getItem(STORE.enabled) === '1';
}
export function setNotifEnabled(v: boolean) {
  localStorage.setItem(STORE.enabled, v ? '1' : '0');
}
export function notifHour(): number {
  const n = parseInt(localStorage.getItem(STORE.hour) ?? '20', 10);
  return isNaN(n) ? 20 : Math.min(23, Math.max(0, n));
}
export function setNotifHour(h: number) {
  localStorage.setItem(STORE.hour, String(h));
}

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

function pendingCount(habits: Habit[], entries: Entry[]) {
  const t = todayKey();
  return habits.filter((h) => {
    const e = entries.find((x) => x.habitId === h.id && x.date === t);
    return !e || e.value < h.target;
  }).length;
}

export async function maybeFireDailyReminder(habits: Habit[], entries: Entry[]) {
  if (!notifEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  if (now.getHours() < notifHour()) return;

  const today = todayKey();
  if (localStorage.getItem(STORE.lastFired) === today) return;

  const pending = pendingCount(habits, entries);
  if (pending === 0) {
    localStorage.setItem(STORE.lastFired, today);
    return;
  }

  const body =
    pending === 1
      ? '1 habit still pending today.'
      : `${pending} habits still pending today.`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification('tend', { body, icon: '/icon-192.png', badge: '/badge-96.png', tag: 'tend-daily' });
      } else {
        new Notification('tend', { body, icon: '/icon-192.png' });
      }
    } else {
      new Notification('tend', { body, icon: '/icon-192.png' });
    }
    localStorage.setItem(STORE.lastFired, today);
  } catch {
    // ignore
  }
}

// Best-effort: register periodic background sync so the SW can re-check while the app is closed.
// Supported on Chrome/Android when the PWA is installed. Silently no-ops elsewhere.
export async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg: ServiceWorkerRegistration & { periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> } } =
      (await navigator.serviceWorker.ready) as never;
    if (!reg.periodicSync) return;
    const status = await (navigator.permissions as Permissions & { query: (d: { name: string }) => Promise<PermissionStatus> })
      .query({ name: 'periodic-background-sync' as PermissionName });
    if (status.state !== 'granted') return;
    await reg.periodicSync.register('tend-daily', { minInterval: 60 * 60 * 1000 });
  } catch {
    // ignore
  }
}
