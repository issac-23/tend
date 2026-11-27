import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authed, redis, SUBS_KEY } from './_lib/common';

/** POST { subscription } stores a Web Push subscription; DELETE { endpoint } removes it. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authed(req, res)) return;
  try {
    if (req.method === 'POST') {
      const sub = req.body?.subscription;
      if (typeof sub?.endpoint !== 'string' || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        return res.status(400).json({ error: 'bad subscription' });
      }
      await redis(['HSET', SUBS_KEY, sub.endpoint, JSON.stringify(sub)]);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const endpoint = req.body?.endpoint;
      if (typeof endpoint !== 'string') return res.status(400).json({ error: 'endpoint required' });
      await redis(['HDEL', SUBS_KEY, endpoint]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
}
