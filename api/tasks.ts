import { toNodeHandler } from './_lib/node.js'
import { createRedisStoreFromEnv } from './_lib/redis-store.js'
import type { TaskStore } from './_lib/store.js'

let store: TaskStore | null | undefined

export default toNodeHandler({
  env: process.env,
  getStore: () => (store === undefined ? (store = createRedisStoreFromEnv(process.env)) : store),
  now: () => Date.now(),
})
