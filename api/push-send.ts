import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { authed, hgetall, isTask, redis, SUBS_KEY, TASKS_KEY, type Task } from './_lib/common';

/**
 * Called on a schedule (GitHub Actions, every ~15 min). Sends a push when the local hour is one
 * of REMIND_HOURS (default 9,13,18 in REMIND_TZ, default America/New_York), once per hour slot,
 * and only if there are open tasks. ?force=1 skips the schedule and dedupe (for testing).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authed(req, res)) return;
  try {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return res.status(500).json({ error: 'VAPID keys missing' });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', pub, priv);

    const tz = process.env.REMIND_TZ ?? 'America/New_York';
    const hours = (process.env.REMIND_HOURS ?? '9,13,18').split(',').map((h) => parseInt(h, 10));
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
    const slot = `${p('year')}-${p('month')}-${p('day')}T${p('hour')}`;
    const force = req.query.force === '1';

    if (!force) {
      if (!hours.includes(parseInt(p('hour'), 10))) return res.status(200).json({ sent: 0, why: 'not a reminder hour' });
      const fresh = await redis<string | null>(['SET', `drift:sent:${slot}`, '1', 'NX', 'EX', 7200]);
      if (!fresh) return res.status(200).json({ sent: 0, why: 'already sent this hour' });
    }

    const tasks = Object.values(await hgetall(TASKS_KEY))
      .map((s) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((t): t is Task => isTask(t) && t.deletedAt === null && (t.status === 'todo' || t.status === 'pending'));
    if (!tasks.length && !force) return res.status(200).json({ sent: 0, why: 'no open tasks' });

    const top = tasks.slice(0, 3).map((t) => t.title).join(' · ');
    const payload = JSON.stringify({
      title: 'tend',
      body: tasks.length ? `${tasks.length} open: ${top}` : 'No open tasks.',
      tag: 'tend-tasks',
      url: '/tasks',
    });

    const subs = await hgetall(SUBS_KEY);
    let sent = 0;
    for (const [endpoint, json] of Object.entries(subs)) {
      try {
        await webpush.sendNotification(JSON.parse(json), payload);
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await redis(['HDEL', SUBS_KEY, endpoint]);
      }
    }
    return res.status(200).json({ sent, open: tasks.length });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
}
