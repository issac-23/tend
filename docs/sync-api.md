# Sync API

A small private API that lets drift (desktop) and the To-do tab in tend (phone) share one task list. It runs as a Vercel Node function in this project (`api/tasks.ts`) and stores tasks in Upstash Redis.

## Endpoints

All requests need `Authorization: Bearer <key>`. Only `GET`, `POST` and `OPTIONS` exist. There are no CORS headers, so only same-origin browser calls work; drift calls from Node and does not need them.

`GET /api/tasks` returns every task, soft-deleted ones included, so devices learn about deletes:

```json
{ "tasks": [ ... ], "serverTime": "2026-06-01T12:00:00.000Z" }
```

`POST /api/tasks` takes the tasks one device changed and returns the full merged list in the same shape:

```json
{ "tasks": [ ... ] }
```

A task is `{ id (uuid), title (1 to 500 chars), category (school|emails|work|life), status (todo|pending|completed|cancelled), createdAt, updatedAt, deletedAt (ISO or null) }`. Unknown keys are rejected. A batch holds at most 1000 tasks and the body at most 1 MB. A task whose `updatedAt` is more than 5 minutes ahead of the server clock rejects the whole batch with 400. All the limits are in `api/_lib/config.ts`.

Merge rule, per id: the incoming copy wins only if its `updatedAt` is strictly newer; on a tie the stored copy stays. Nothing is hard-deleted: `deletedAt` stays set until a strictly newer update sends `deletedAt: null`.

Status codes: 200 ok, 204 OPTIONS, 400 invalid body, 401 bad or missing key, 405 other methods, 413 body too large, 503 sync not configured, 500 storage error.

## Set up

1. In the Vercel dashboard open the tend project, go to the Storage tab and add Upstash Redis. The integration injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names also work).
2. Generate one key per device:

   ```
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   ```

3. In Project Settings, Environment Variables, set `DRIFT_SYNC_KEYS` to the keys separated by commas, for example `key-for-laptop,key-for-phone`. Redeploy so the function sees it.
4. Put each device's key in that device's own config, never in the repo.

If `DRIFT_SYNC_KEYS` is missing or empty, every request returns 503. The API is never open by default. To revoke a device, remove its key from the list and redeploy.

Keys must never be committed. This repository is public: no keys, tokens or deployment URLs in code, docs, tests or commit messages.

## Concurrency

The merge runs as one Lua script inside Redis, so two simultaneous POSTs cannot lose each other's updates. Tasks live in one hash, `drift:tasks`, keyed by id.
