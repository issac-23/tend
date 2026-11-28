import type { IncomingMessage, ServerResponse } from 'node:http'
import { MAX_BODY_BYTES } from './config.js'
import { handleTasks, type HandlerDeps } from './handler.js'

/** Reads the body up to MAX_BODY_BYTES; resolves null when it is larger. */
function readBody(req: IncomingMessage): Promise<string | null> {
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const onData = (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        req.off('data', onData)
        req.pause()
        resolve(null)
        return
      }
      chunks.push(chunk)
    }
    req.on('data', onData)
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** Adapts handleTasks to a Vercel Node function (req, res). */
export function toNodeHandler(deps: HandlerDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: string | undefined
    if (req.method === 'POST') {
      const read = await readBody(req).catch(() => null)
      if (read === null) {
        res.writeHead(413, { 'Content-Type': 'application/json', Connection: 'close' })
        res.end(JSON.stringify({ error: 'payload_too_large' }))
        return
      }
      body = read
    }
    const out = await handleTasks({ method: req.method ?? 'GET', headers: req.headers, body }, deps)
    res.writeHead(out.status, out.headers)
    res.end(out.body)
  }
}
