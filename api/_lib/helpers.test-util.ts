import { handleTasks, type ApiResponse, type HandlerDeps } from './handler.js'
import { MemoryTaskStore, type TaskStore } from './store.js'
import type { Task } from './schema.js'

export const NOW = Date.parse('2026-06-01T12:00:00.000Z')
export const KEY_A = 'test-key-device-a'
export const KEY_B = 'test-key-device-b'

export function makeDeps(opts: { store?: TaskStore | null; keys?: string | undefined; now?: number } = {}): HandlerDeps {
  const store = opts.store === undefined ? new MemoryTaskStore() : opts.store
  return {
    env: { DRIFT_SYNC_KEYS: 'keys' in opts ? opts.keys : `${KEY_A},${KEY_B}` },
    getStore: () => store,
    now: () => opts.now ?? NOW,
  }
}

export function iso(offsetMs = 0): string {
  return new Date(NOW + offsetMs).toISOString()
}

let counter = 0
export function makeTask(over: Partial<Task> = {}): Task {
  counter += 1
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    title: 'a task',
    category: 'work',
    status: 'todo',
    createdAt: iso(-60_000),
    updatedAt: iso(-60_000),
    deletedAt: null,
    ...over,
  }
}

export function call(
  deps: HandlerDeps,
  method: string,
  opts: { key?: string | null; body?: unknown; rawBody?: string } = {},
): Promise<ApiResponse> {
  const headers: Record<string, string> = {}
  if (opts.key !== null) headers.authorization = `Bearer ${opts.key ?? KEY_A}`
  const body = opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body))
  return handleTasks({ method, headers, body }, deps)
}

export const post = (deps: HandlerDeps, tasks: unknown[], key = KEY_A) =>
  call(deps, 'POST', { key, body: { tasks } })

export const tasksOf = (res: ApiResponse): Task[] => JSON.parse(res.body).tasks
