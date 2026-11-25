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
