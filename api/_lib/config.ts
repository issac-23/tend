/** Every tunable number for the sync API lives here. */

/** Most tasks accepted in one POST. */
export const MAX_BATCH = 1000
/** Largest request body in bytes. 1000 ordinary tasks are roughly 350 KB. */
export const MAX_BODY_BYTES = 1024 * 1024
export const MAX_TITLE_LENGTH = 500
/** An updatedAt further ahead of the server clock than this is rejected. */
export const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000
/** Redis hash holding every task, keyed by task id. */
export const TASKS_HASH_KEY = 'drift:tasks'
