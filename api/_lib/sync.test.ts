// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MAX_BATCH, MAX_BODY_BYTES, MAX_FUTURE_SKEW_MS, MAX_TITLE_LENGTH, TASKS_HASH_KEY } from './config.js'
import { MemoryTaskStore } from './store.js'
import { MERGE_SCRIPT, RedisTaskStore, redisConfigFromEnv, type RedisLike } from './redis-store.js'
import { KEY_A, KEY_B, call, iso, makeDeps, makeTask, post, tasksOf } from './helpers.test-util.js'

describe('auth', () => {
  it('returns 503 for every request when DRIFT_SYNC_KEYS is missing or empty', async () => {
    for (const keys of [undefined, '', ' , ,']) {
      const deps = makeDeps({ keys })
      for (const method of ['GET', 'POST', 'OPTIONS', 'DELETE']) {
        expect((await call(deps, method, { key: KEY_A })).status).toBe(503)
      }
    }
  })

  it('returns 401 for a missing or bad key, with no detail', async () => {
    const deps = makeDeps()
    for (const key of [null, 'wrong', '']) {
      const res = await call(deps, 'GET', { key })
      expect(res.status).toBe(401)
      expect(JSON.parse(res.body)).toEqual({ error: 'unauthorized' })
    }
    const res = await call(deps, 'POST', { key: 'wrong', body: { tasks: [] } })
    expect(res.status).toBe(401)
  })

  it('rejects a non-bearer scheme and a key that is only a prefix', async () => {
    const deps = makeDeps()
    const basic = await (await import('./handler.js')).handleTasks(
      { method: 'GET', headers: { authorization: `Basic ${KEY_A}` } },
      deps,
    )
    expect(basic.status).toBe(401)
    expect((await call(deps, 'GET', { key: KEY_A.slice(0, -1) })).status).toBe(401)
  })

  it('returns 200 for any configured device key', async () => {
    const deps = makeDeps()
    expect((await call(deps, 'GET', { key: KEY_A })).status).toBe(200)
    expect((await call(deps, 'GET', { key: KEY_B })).status).toBe(200)
  })

  it('answers OPTIONS without CORS headers and refuses other methods', async () => {
    const deps = makeDeps()
    const opt = await call(deps, 'OPTIONS', { key: null })
    expect(opt.status).toBe(204)
    expect(Object.keys(opt.headers).some((h) => h.toLowerCase().startsWith('access-control'))).toBe(false)
    expect((await call(deps, 'PUT', { body: {} })).status).toBe(405)
    expect((await call(deps, 'DELETE')).status).toBe(405)
  })

  it('returns 503 when storage is not configured', async () => {
    expect((await call(makeDeps({ store: null }), 'GET')).status).toBe(503)
  })
})

describe('validation', () => {
  const bad = async (task: unknown) => {
    const res = await post(makeDeps(), [task])
    expect(res.status).toBe(400)
  }

  it('accepts a valid task and returns serverTime', async () => {
    const res = await post(makeDeps(), [makeTask()])
    expect(res.status).toBe(200)
    expect(JSON.parse(res.body).serverTime).toBe(iso())
  })

  it('rejects wrong shapes', async () => {
    await bad({ ...makeTask(), id: 'not-a-uuid' })
    await bad({ ...makeTask(), title: '' })
    await bad({ ...makeTask(), title: 'x'.repeat(MAX_TITLE_LENGTH + 1) })
    await bad({ ...makeTask(), category: 'play' })
    await bad({ ...makeTask(), status: 'done' })
    await bad({ ...makeTask(), createdAt: 'yesterday' })
    await bad({ ...makeTask(), updatedAt: 123 })
    await bad({ ...makeTask(), updatedAt: '2026-06-01T12:00:00+02:00' })
    await bad({ ...makeTask(), deletedAt: undefined })
    await bad({ ...makeTask(), deletedAt: 'nope' })
    await bad('a string')
    await bad(null)
    const { title: _title, ...noTitle } = makeTask()
    void _title
    await bad(noTitle)
  })

  it('accepts a title of exactly the maximum length', async () => {
    const res = await post(makeDeps(), [makeTask({ title: 'x'.repeat(MAX_TITLE_LENGTH) })])
    expect(res.status).toBe(200)
  })

  it('rejects unknown keys on a task and on the body', async () => {
    await bad({ ...makeTask(), extra: 1 })
    const res = await call(makeDeps(), 'POST', { body: { tasks: [], extra: true } })
    expect(res.status).toBe(400)
  })

  it('rejects bad JSON and a missing tasks array', async () => {
    expect((await call(makeDeps(), 'POST', { rawBody: '{nope' })).status).toBe(400)
    expect((await call(makeDeps(), 'POST', { rawBody: '' })).status).toBe(400)
    expect((await call(makeDeps(), 'POST', { body: {} })).status).toBe(400)
    expect((await call(makeDeps(), 'POST', { body: { tasks: 'x' } })).status).toBe(400)
  })

  it('caps batch size and body size', async () => {
    const full = Array.from({ length: MAX_BATCH }, () => makeTask())
    expect((await post(makeDeps(), full)).status).toBe(200)
    expect((await post(makeDeps(), [...full, makeTask()])).status).toBe(400)
    const huge = 'x'.repeat(MAX_BODY_BYTES + 1)
    expect((await call(makeDeps(), 'POST', { rawBody: huge })).status).toBe(413)
  })

  it('normalises timestamps and ids so ordering is chronological', async () => {
    const deps = makeDeps()
    const t = makeTask({ updatedAt: '2026-06-01T11:00:00Z' })
    const res = await post(deps, [{ ...t, id: t.id.toUpperCase() }])
    const stored = tasksOf(res)[0]
    expect(stored.id).toBe(t.id)
    expect(stored.updatedAt).toBe('2026-06-01T11:00:00.000Z')
  })
})

describe('future timestamp guard', () => {
  it('skips a task dated beyond the skew but keeps the rest of the batch', async () => {
    const deps = makeDeps()
    const ok = makeTask()
    const future = makeTask({ updatedAt: iso(MAX_FUTURE_SKEW_MS + 1000) })
    const res = await post(deps, [ok, future])
    expect(res.status).toBe(200)
    expect(JSON.parse(res.body).rejected).toEqual([future.id])
    expect(tasksOf(await call(deps, 'GET'))).toEqual([ok])
  })

  it('accepts updatedAt right at the limit', async () => {
    const res = await post(makeDeps(), [makeTask({ updatedAt: iso(MAX_FUTURE_SKEW_MS) })])
    expect(res.status).toBe(200)
  })
})

describe('last-writer-wins merge', () => {
  it('stores new tasks and returns the full list', async () => {
    const deps = makeDeps()
    const a = makeTask()
    const b = makeTask()
    await post(deps, [a])
    const res = await post(deps, [b])
    expect(tasksOf(res).map((t) => t.id).sort()).toEqual([a.id, b.id].sort())
    expect(tasksOf(await call(deps, 'GET'))).toHaveLength(2)
  })

  it('a strictly newer update wins', async () => {
    const deps = makeDeps()
    const t = makeTask()
    await post(deps, [t])
    const res = await post(deps, [{ ...t, title: 'newer', updatedAt: iso(-1000) }])
    expect(tasksOf(res)[0].title).toBe('newer')
  })

  it('an older update loses', async () => {
    const deps = makeDeps()
    const t = makeTask({ title: 'current', updatedAt: iso(-1000) })
    await post(deps, [t])
    const res = await post(deps, [{ ...t, title: 'stale', updatedAt: iso(-5000) }])
    expect(tasksOf(res)[0].title).toBe('current')
  })

  it('a tie keeps the stored copy', async () => {
    const deps = makeDeps()
    const t = makeTask({ title: 'first' })
    await post(deps, [t])
    const res = await post(deps, [{ ...t, title: 'second' }])
    expect(tasksOf(res)[0].title).toBe('first')
  })

  it('a soft delete is kept and returned', async () => {
    const deps = makeDeps()
    const t = makeTask()
    await post(deps, [t])
    await post(deps, [{ ...t, updatedAt: iso(-1000), deletedAt: iso(-1000) }])
    const got = tasksOf(await call(deps, 'GET'))
    expect(got).toHaveLength(1)
    expect(got[0].deletedAt).toBe(iso(-1000))
  })

  it('a stale or tied update cannot clear a delete', async () => {
    const deps = makeDeps()
    const t = makeTask()
    const deleted = { ...t, updatedAt: iso(-1000), deletedAt: iso(-1000) }
    await post(deps, [deleted])
    await post(deps, [{ ...t, updatedAt: iso(-5000), deletedAt: null }])
    await post(deps, [{ ...deleted, deletedAt: null }])
    expect(tasksOf(await call(deps, 'GET'))[0].deletedAt).toBe(iso(-1000))
  })

  it('a strictly newer update can clear a delete', async () => {
    const deps = makeDeps()
    const t = makeTask()
    await post(deps, [{ ...t, updatedAt: iso(-1000), deletedAt: iso(-1000) }])
    await post(deps, [{ ...t, updatedAt: iso(-500), deletedAt: null }])
    expect(tasksOf(await call(deps, 'GET'))[0].deletedAt).toBeNull()
  })

  it('duplicate ids in one batch resolve by the same rule', async () => {
    const deps = makeDeps()
    const t = makeTask()
    const res = await post(deps, [
      { ...t, title: 'old', updatedAt: iso(-3000) },
      { ...t, title: 'newest', updatedAt: iso(-1000) },
      { ...t, title: 'middle', updatedAt: iso(-2000) },
    ])
    expect(tasksOf(res)).toHaveLength(1)
    expect(tasksOf(res)[0].title).toBe('newest')
  })

  it('an empty batch is a plain read', async () => {
    const deps = makeDeps()
    await post(deps, [makeTask()])
    expect(tasksOf(await post(deps, []))).toHaveLength(1)
  })
})

describe('two devices with offline edits', () => {
  const run = async (order: 'AB' | 'BA') => {
    const deps = makeDeps()
    const shared = makeTask({ title: 'shared', updatedAt: iso(-100_000) })
    const onlyA = makeTask({ title: 'only on A' })
    const onlyB = makeTask({ title: 'only on B' })
    const other = makeTask({ title: 'edited by both', updatedAt: iso(-100_000) })
    await post(deps, [shared, other])

    // Offline: A edits the shared task (later) and adds one; B edits the same
    // shared task (earlier), deletes another, and adds one.
    const aEdits = [
      { ...shared, title: 'shared, A edit', status: 'completed', updatedAt: iso(-20_000) },
      { ...other, title: 'other, A edit', updatedAt: iso(-30_000) },
      onlyA,
    ]
    const bEdits = [
      { ...shared, title: 'shared, B edit', updatedAt: iso(-50_000) },
      { ...other, title: 'other, B edit', updatedAt: iso(-10_000) },
      onlyB,
    ]

    const first = order === 'AB' ? aEdits : bEdits
    const second = order === 'AB' ? bEdits : aEdits
    const k1 = order === 'AB' ? KEY_A : KEY_B
    const k2 = order === 'AB' ? KEY_B : KEY_A
    await post(deps, first, k1)
    await post(deps, second, k2)

    // Each device then pulls; both see the same list.
    const seenByA = tasksOf(await call(deps, 'GET', { key: KEY_A }))
    const seenByB = tasksOf(await call(deps, 'GET', { key: KEY_B }))
    expect(seenByA).toEqual(seenByB)
    return Object.fromEntries(seenByA.map((t) => [t.id, t]))
  }

  it('converges to the same result in either order', async () => {
    const ab = await run('AB')
    const ba = await run('BA')
    const view = (m: Record<string, { title: string }>) => Object.values(m).map((t) => t.title).sort()
    expect(view(ab)).toEqual(view(ba))
    expect(view(ab)).toEqual(['only on A', 'only on B', 'other, B edit', 'shared, A edit'].sort())
  })
})

describe('concurrent POSTs', () => {
  it('lose no updates on the in-memory store', async () => {
    const store = new MemoryTaskStore()
    const deps = makeDeps({ store })
    const shared = makeTask()
    const jobs = Array.from({ length: 50 }, (_, i) =>
      post(deps, [
        makeTask({ title: `unique ${i}` }),
        // Every request also edits the shared task; the newest must survive.
        { ...shared, title: `edit ${i}`, updatedAt: iso(-100_000 + i * 1000) },
      ]),
    )
    const results = await Promise.all(jobs)
    expect(results.every((r) => r.status === 200)).toBe(true)

    const all = await store.getAll()
    expect(all).toHaveLength(51)
    expect(all.find((t) => t.id === shared.id)?.title).toBe('edit 49')
  })
})

describe('RedisTaskStore (fake client)', () => {
  it('sends the Lua merge script with the hash key and JSON args, and parses the reply', async () => {
    const t = makeTask()
    const calls: { script: string; keys: string[]; args: string[] }[] = []
    const fake: RedisLike = {
      eval: async (script, keys, args) => {
        calls.push({ script, keys, args })
        // Reply as raw strings.
        return args
      },
      hvals: async () => [JSON.stringify(t)],
    }
    const store = new RedisTaskStore(fake)
    expect(await store.merge([t])).toEqual([t])
    expect(calls[0].script).toBe(MERGE_SCRIPT)
    expect(calls[0].keys).toEqual([TASKS_HASH_KEY])
    expect(JSON.parse(calls[0].args[0])).toEqual(t)
    expect(await store.getAll()).toEqual([t])
  })

  it('also accepts replies the client already parsed, and skips junk', async () => {
    const t = makeTask()
    const store = new RedisTaskStore({
      eval: async () => [t, '{not json', { id: 'bad' }],
      hvals: async () => 'nope',
    })
    expect(await store.merge([])).toEqual([t])
    expect(await store.getAll()).toEqual([])
  })

  it('the script only replaces on a strictly newer updatedAt', () => {
    expect(MERGE_SCRIPT).toContain('inc.updatedAt > stored.updatedAt')
    expect(MERGE_SCRIPT).not.toMatch(/HDEL|DEL /)
  })

  it('reads either pair of env var names', () => {
    expect(redisConfigFromEnv({})).toBeNull()
    expect(redisConfigFromEnv({ KV_REST_API_URL: 'u' })).toBeNull()
    expect(redisConfigFromEnv({ KV_REST_API_URL: 'u1', KV_REST_API_TOKEN: 't1' })).toEqual({ url: 'u1', token: 't1' })
    expect(redisConfigFromEnv({ UPSTASH_REDIS_REST_URL: 'u2', UPSTASH_REDIS_REST_TOKEN: 't2' })).toEqual({
      url: 'u2',
      token: 't2',
    })
  })
})
