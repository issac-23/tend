import { z } from 'zod'
import { MAX_BATCH, MAX_TITLE_LENGTH } from './config.js'

// Must match drift's src/shared/types.ts.
export const CATEGORIES = ['school', 'emails', 'work', 'life'] as const
export const STATUSES = ['todo', 'pending', 'completed', 'cancelled'] as const

/**
 * Timestamps are re-serialised with toISOString() so every stored value has
 * the same fixed-width format. The merge compares them as plain strings, which
 * is only correct when the format is uniform.
 */
const isoDate = z.iso.datetime().transform((s) => new Date(s).toISOString())

export const taskSchema = z.strictObject({
  id: z.uuid().transform((s) => s.toLowerCase()),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES),
  createdAt: isoDate,
  updatedAt: isoDate,
  deletedAt: isoDate.nullable(),
})

export const postBodySchema = z.strictObject({
  tasks: z.array(taskSchema).max(MAX_BATCH),
})

export type Task = z.output<typeof taskSchema>
