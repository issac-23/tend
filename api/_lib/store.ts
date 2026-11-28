import type { Task } from './schema.js'
import { mergeTask, sortTasks } from './merge.js'

export interface TaskStore {
  getAll(): Promise<Task[]>
  /**
   * Merge a batch atomically (see mergeTask) and return every stored task,
   * soft-deleted ones included. Concurrent calls must not lose updates.
   */
  merge(incoming: Task[]): Promise<Task[]>
}

export class MemoryTaskStore implements TaskStore {
  private tasks = new Map<string, Task>()

  async getAll(): Promise<Task[]> {
    return sortTasks([...this.tasks.values()])
  }

  async merge(incoming: Task[]): Promise<Task[]> {
    // Yield first so concurrent callers really interleave. The read-merge-write
    // below has no await in it, so it is atomic on the event loop.
    await Promise.resolve()
    for (const task of incoming) this.tasks.set(task.id, mergeTask(this.tasks.get(task.id), task))
    return sortTasks([...this.tasks.values()])
  }
}
