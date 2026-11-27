# tend

A quiet, local-first habit tracker. PWA — install it to your home screen, use it offline, your data stays on your device.

Every Sunday, open it up and have a real reflection conversation with Claude about your week. No API key, no charges — uses your free claude.ai account.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Dexie (IndexedDB)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## Deploy

Push to GitHub, import the repo at vercel.com — Vercel auto-detects Vite. No env vars.

## Add to home screen

- **Android Chrome**: ⋮ menu → Install app
- **iOS Safari**: Share button → Add to Home Screen
- **Desktop Chrome**: install icon in the address bar

## Data

Everything lives in IndexedDB on the device. Export regularly from **Settings → Backup** so you don't lose it.

## Weekly reflection

1. Open **Weekly** (any day, but especially Sunday)
2. Tap **Reflect with Claude** — copies a prompt with your stats to clipboard, opens claude.ai in a new tab
3. Paste (Ctrl/Cmd+V or long-press), hit send
4. Talk it through. Ask Claude to write you a markdown summary for Obsidian at the end. Copy that out.

## Tasks and drift sync

tend has a Tasks tab that syncs with the drift desktop app through serverless functions in `api/`, so you can work the list from your phone while the laptop is off. Server reminders are real Web Push, so they arrive even when tend is closed.

Setup (once):

1. In the Vercel project, add an Upstash Redis store (Storage tab, Marketplace). It sets the `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` env vars.
2. `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and optionally `VAPID_SUBJECT` (`mailto:you@example.com`).
3. Set `DRIFT_SYNC_TOKEN` to a long random string. Optional: `REMIND_HOURS` (default `9,13,18`) and `REMIND_TZ` (default `America/New_York`).
4. In the GitHub repo secrets, set `TEND_URL` (your deployed origin, no trailing slash) and `DRIFT_SYNC_TOKEN` (same value). The `remind.yml` workflow pings `/api/push-send` every 15 minutes; the endpoint only sends in a reminder hour, once per hour, and only when tasks are open.
5. In tend: Settings, Task sync, paste the token, Save and sync, then Turn on server reminders. On iPhone, add tend to the home screen first.

Test a push: `curl -X POST -H "Authorization: Bearer $TOKEN" "$URL/api/push-send?force=1"`.
