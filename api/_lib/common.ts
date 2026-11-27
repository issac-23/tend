import type { VercelRequest, VercelResponse } from '@vercel/node';

export type Task = {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** Single-user bearer token. Set DRIFT_SYNC_TOKEN in the Vercel project. */
export function authed(req: VercelRequest, res: VercelResponse): boolean {
  const want = process.env.DRIFT_SYNC_TOKEN;
  const got = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!want || got.length !== want.length || got !== want) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis env vars missing');
  return { url, token };
}

/** One Redis command over Upstash's REST API, e.g. redis(['HGETALL', 'tasks']). */
export async function redis<T = unknown>(cmd: (string | number)[]): Promise<T> {
  const { url, token } = redisEnv();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = (await r.json()) as { result?: T; error?: string };
  if (!r.ok || j.error) throw new Error(j.error ?? `redis ${r.status}`);
  return j.result as T;
}

/** HGETALL comes back as a flat [field, value, ...] array. */
export async function hgetall(key: string): Promise<Record<string, string>> {
  const flat = await redis<string[]>(['HGETALL', key]);
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

export function isTask(t: unknown): t is Task {
  if (typeof t !== 'object' || t === null) return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.id === 'string' && o.id.length > 0 && o.id.length < 100 &&
    typeof o.title === 'string' && o.title.length < 500 &&
    typeof o.category === 'string' && typeof o.status === 'string' &&
    typeof o.createdAt === 'string' && typeof o.updatedAt === 'string' &&
    (o.deletedAt === null || typeof o.deletedAt === 'string')
  );
}

export const TASKS_KEY = 'drift:tasks';
export const SUBS_KEY = 'drift:push-subs';
