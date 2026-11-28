import { createHash, timingSafeEqual } from 'node:crypto'

const digest = (s: string) => createHash('sha256').update(s).digest()

/** Keys from DRIFT_SYNC_KEYS (comma separated, one per device). */
export function parseKeys(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
}

export function bearerToken(header: string | string[] | undefined): string | null {
  if (typeof header !== 'string') return null
  const m = /^Bearer +(\S+)$/i.exec(header.trim())
  return m ? m[1] : null
}

/** Compares SHA-256 digests in constant time, against every key, no early exit. */
export function isValidKey(token: string | null, keys: string[]): boolean {
  if (token === null) return false
  const given = digest(token)
  let ok = false
  for (const key of keys) {
    if (timingSafeEqual(given, digest(key))) ok = true
  }
  return ok
}
