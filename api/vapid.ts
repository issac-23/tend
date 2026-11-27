import type { VercelRequest, VercelResponse } from '@vercel/node';

/** The public VAPID key is public by design; the browser needs it to subscribe. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
}
