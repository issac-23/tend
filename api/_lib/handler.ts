import { MAX_BODY_BYTES, MAX_FUTURE_SKEW_MS } from './config.js'
import { bearerToken, isValidKey, parseKeys } from './auth.js'
import { postBodySchema } from './schema.js'
import { reduceBatch } from './merge.js'
import type { TaskStore } from './store.js'

export interface ApiRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  /** Raw request body. */
  body?: string
}

export interface ApiResponse {
  status: number
  headers: Record<string, string>
  body: string
}

export interface HandlerDeps {
  env: Record<string, string | undefined>
  /** Null when storage is not configured. */
  getStore: () => TaskStore | null
  now: () => number
}

// No CORS headers on purpose: only the same-origin tend PWA calls from a
// browser, and drift calls from Node.
const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

function json(status: number, data: unknown, extra: Record<string, string> = {}): ApiResponse {
  return { status, headers: { ...BASE_HEADERS, ...extra }, body: JSON.stringify(data) }
}

export async function handleTasks(req: ApiRequest, deps: HandlerDeps): Promise<ApiResponse> {
  const keys = parseKeys(deps.env.DRIFT_SYNC_KEYS)
  if (keys.length === 0) return json(503, { error: 'sync_disabled' })

  const method = req.method.toUpperCase()
  if (method === 'OPTIONS') {
    return {
      status: 204,
      headers: { Allow: 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' },
      body: '',
    }
  }

  if (!isValidKey(bearerToken(req.headers.authorization), keys)) {
    return json(401, { error: 'unauthorized' }, { 'WWW-Authenticate': 'Bearer' })
  }

  if (method !== 'GET' && method !== 'POST') {
    return json(405, { error: 'method_not_allowed' }, { Allow: 'GET, POST, OPTIONS' })
  }

  const store = deps.getStore()
  if (!store) return json(503, { error: 'storage_unavailable' })

  try {
    if (method === 'GET') {
      const tasks = await store.getAll()
      return json(200, { tasks, serverTime: new Date(deps.now()).toISOString() })
    }

    const raw = req.body ?? ''
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return json(413, { error: 'payload_too_large' })

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const parsed = postBodySchema.safeParse(parsedJson)
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 10).map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
      return json(400, { error: 'invalid_body', issues })
    }

    const limit = deps.now() + MAX_FUTURE_SKEW_MS
    const future = parsed.data.tasks.find((t) => Date.parse(t.updatedAt) > limit)
    if (future) return json(400, { error: 'updated_at_in_future', id: future.id })

    const tasks = await store.merge(reduceBatch(parsed.data.tasks))
    return json(200, { tasks, serverTime: new Date(deps.now()).toISOString() })
  } catch {
    return json(500, { error: 'storage_error' })
  }
}
