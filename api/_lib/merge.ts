import type { Task } from './schema.js'

/**
 * Last-writer-wins on updatedAt. The incoming copy replaces the stored one
 * only if it is strictly newer; on a tie the stored copy stays. The whole
 * record is replaced, so deletedAt stays set until a strictly newer update
 * carries deletedAt: null. Nothing is ever hard-deleted.
 *
 * updatedAt values are fixed-width ISO strings (see schema.ts), so string
 * comparison is chronological. The Lua script in redis-store.ts mirrors this.
 */
export function mergeTask(stored: Task | undefined, incoming: Task): Task {
  if (!stored) return incoming
  return incoming.updatedAt > stored.updatedAt ? incoming : stored
}

/** Collapse repeated ids inside one batch with the same rule. */
export function reduceBatch(tasks: Task[]): Task[] {
  const byId = new Map<string, Task>()
  for (const task of tasks) byId.set(task.id, mergeTask(byId.get(task.id), task))
  return [...byId.values()]
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )
}
