import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authed, hgetall, isTask, redis, TASKS_KEY, type Task } from './_lib/common';

const parse = (s: string): Task | null => {
  try {
    const t = JSON.parse(s);
    return isTask(t) ? t : null;
  } catch {
    return null;
  }
};

/**
 * GET  /api/tasks?since=ISO   tasks changed after `since` (tombstones included)
 * POST /api/tasks             body { tasks: Task[] }, last-write-wins on updatedAt
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authed(req, res)) return;
  try {
    const stored = await hgetall(TASKS_KEY);

    if (req.method === 'GET') {
      const since = typeof req.query.since === 'string' ? req.query.since : '';
      const tasks = Object.values(stored)
        .map(parse)
        .filter((t): t is Task => !!t && t.updatedAt > since);
      return res.status(200).json({ tasks, now: new Date().toISOString() });
    }

    if (req.method === 'POST') {
      const incoming: unknown = req.body?.tasks;
      if (!Array.isArray(incoming) || incoming.length > 2000) {
        return res.status(400).json({ error: 'tasks array required' });
      }
      const write: (string | number)[] = ['HSET', TASKS_KEY];
      let accepted = 0;
      for (const t of incoming) {
        if (!isTask(t)) continue;
        const cur = stored[t.id] ? parse(stored[t.id]) : null;
        if (cur && cur.updatedAt >= t.updatedAt) continue;
        write.push(t.id, JSON.stringify(t));
        accepted++;
      }
      if (accepted) await redis(write);
      return res.status(200).json({ accepted });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
}
