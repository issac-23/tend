import { Redis } from '@upstash/redis'
import { TASKS_HASH_KEY } from './config.js'
import { taskSchema, type Task } from './schema.js'
import { sortTasks } from './merge.js'
import type { TaskStore } from './store.js'

/**
 * Atomic merge. Upstash's REST API has no WATCH/MULTI, so the whole
 * read-compare-write runs inside one Lua script, which Redis executes without
 * interleaving any other command. Same rule as mergeTask: replace only when the
 * incoming updatedAt is strictly newer (fixed-width ISO strings compare
 * chronologically). Returns every stored value.
 */
export const MERGE_SCRIPT = `
local key = KEYS[1]
for i = 1, #ARGV do
  local inc = cjson.decode(ARGV[i])
  local cur = redis.call('HGET', key, inc.id)
  local win = true
  if cur then
    local stored = cjson.decode(cur)
    if not (inc.updatedAt > stored.updatedAt) then win = false end
  end
  if win then redis.call('HSET', key, inc.id, ARGV[i]) end
end
return redis.call('HVALS', key)
`

/** The two calls we use, so tests can pass a fake. */
export interface RedisLike {
  eval(script: string, keys: string[], args: string[]): Promise<unknown>
  hvals(key: string): Promise<unknown>
}

/** Values may come back as strings or, if the client parsed them, as objects. */
export function parseValues(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return []
  const tasks: Task[] = []
  for (const item of raw) {
    let value: unknown = item
    if (typeof item === 'string') {
      try {
        value = JSON.parse(item)
      } catch {
        continue
      }
    }
    const parsed = taskSchema.safeParse(value)
    if (parsed.success) tasks.push(parsed.data)
  }
  return sortTasks(tasks)
}

export class RedisTaskStore implements TaskStore {
  private redis: RedisLike

  constructor(redis: RedisLike) {
    this.redis = redis
  }

  async getAll(): Promise<Task[]> {
    return parseValues(await this.redis.hvals(TASKS_HASH_KEY))
  }

  async merge(incoming: Task[]): Promise<Task[]> {
    const args = incoming.map((t) => JSON.stringify(t))
    return parseValues(await this.redis.eval(MERGE_SCRIPT, [TASKS_HASH_KEY], args))
  }
}

type Env = Record<string, string | undefined>

/** Accepts the names the Vercel marketplace integration injects, either set. */
export function redisConfigFromEnv(env: Env): { url: string; token: string } | null {
  const pairs: [string | undefined, string | undefined][] = [
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN],
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
  ]
  for (const [url, token] of pairs) if (url && token) return { url, token }
  return null
}

export function createRedisStoreFromEnv(env: Env): TaskStore | null {
  const config = redisConfigFromEnv(env)
  if (!config) return null
  // automaticDeserialization off: we store raw JSON strings and parse them ourselves.
  const redis = new Redis({ ...config, automaticDeserialization: false })
  return new RedisTaskStore(redis as unknown as RedisLike)
}
