// @vitest-environment node
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MAX_BODY_BYTES } from './config.js'
import { toNodeHandler } from './node.js'
import { KEY_A, makeDeps, makeTask } from './helpers.test-util.js'

let server: Server
let base: string

beforeAll(async () => {
  server = createServer(toNodeHandler(makeDeps()))
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

const auth = { Authorization: `Bearer ${KEY_A}` }

describe('node adapter', () => {
  it('round-trips a POST then GET over real HTTP', async () => {
    const t = makeTask()
    const post = await fetch(base, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: [t] }),
    })
    expect(post.status).toBe(200)
    expect(post.headers.get('access-control-allow-origin')).toBeNull()
    const get = await fetch(base, { headers: auth })
    expect(((await get.json()) as { tasks: unknown }).tasks).toEqual([t])
  })

  it('returns 401 without a key', async () => {
    expect((await fetch(base)).status).toBe(401)
  })

  it('returns 413 for an oversized body', async () => {
    const res = await fetch(base, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: 'x'.repeat(MAX_BODY_BYTES + 10),
    })
    expect(res.status).toBe(413)
  })
})
